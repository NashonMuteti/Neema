import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);

    if (authError || !user) {
      console.error("[record-daily-sale] Edge Function Auth Error:", authError?.message);
      return new Response('Unauthorized: Invalid or expired token', { status: 401, headers: corsHeaders });
    }

    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("[record-daily-sale] Edge Function Profile Error:", profileError?.message);
      return new Response('Forbidden: User profile not found or access denied', { status: 403, headers: corsHeaders });
    }

    const userRole = profile.role;
    const allowedRoles = ['Admin', 'Super Admin', 'Project Manager'];

    if (!allowedRoles.includes(userRole)) {
      return new Response('Forbidden: Insufficient privileges to record sales', { status: 403, headers: corsHeaders });
    }

    const {
      customer_name,
      sale_date,
      payment_method,
      received_into_account_id,
      notes,
      sale_items,
      payments,
    } = await req.json();

    if (!sale_items || sale_items.length === 0) {
      return new Response('Bad Request: No sale items provided', { status: 400, headers: corsHeaders });
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return new Response('Bad Request: No payments provided', { status: 400, headers: corsHeaders });
    }

    let total_amount = 0;
    const productUpdates: Array<{ id: string; new_stock: number }> = [];

    for (const item of sale_items) {
      const { product_id, quantity, unit_price } = item;
      if (!product_id || !quantity || !unit_price) {
        return new Response('Bad Request: Invalid sale item data', { status: 400, headers: corsHeaders });
      }

      const { data: product, error: productError } = await supabaseServiceRole
        .from('products')
        .select('current_stock')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        return new Response(`Bad Request: Product with ID ${product_id} not found.`, { status: 400, headers: corsHeaders });
      }

      if (product.current_stock < quantity) {
        return new Response(`Bad Request: Insufficient stock for product ID ${product_id}. Available: ${product.current_stock}, Requested: ${quantity}`, { status: 400, headers: corsHeaders });
      }

      const subtotal = quantity * unit_price;
      total_amount += subtotal;
      productUpdates.push({
        id: product_id,
        new_stock: product.current_stock - quantity,
      });
    }

    const total_paid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    if (total_paid <= 0) {
      return new Response('Bad Request: Total paid must be greater than 0', { status: 400, headers: corsHeaders });
    }
    if (total_paid > total_amount + 0.00001) {
      return new Response('Bad Request: Total paid cannot exceed sale total', { status: 400, headers: corsHeaders });
    }

    const primaryAccountId = received_into_account_id || payments[0]?.account_id || null;

    const { data: saleData, error: saleError } = await supabaseServiceRole
      .from('sales_transactions')
      .insert({
        profile_id: user.id,
        customer_name,
        sale_date,
        total_amount,
        payment_method: payment_method || 'Split',
        received_into_account_id: primaryAccountId,
        notes,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      console.error("[record-daily-sale] Error inserting sales_transaction:", saleError);
      return new Response(JSON.stringify({ error: saleError?.message || 'Failed to create sale transaction.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const sale_id = saleData.id;

    for (const item of sale_items) {
      const { product_id, quantity, unit_price } = item;
      const subtotal = quantity * unit_price;

      const { error: saleItemError } = await supabaseServiceRole
        .from('sale_items')
        .insert({
          sale_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
        });

      if (saleItemError) {
        console.error("[record-daily-sale] Error inserting sale_item:", saleItemError);
        return new Response(JSON.stringify({ error: saleItemError?.message || 'Failed to create sale item.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const productUpdate = productUpdates.find(pu => pu.id === product_id);
      if (productUpdate) {
        const { error: stockUpdateError } = await supabaseServiceRole
          .from('products')
          .update({ current_stock: productUpdate.new_stock })
          .eq('id', product_id);

        if (stockUpdateError) {
          console.error("[record-daily-sale] Error updating product stock:", stockUpdateError);
          return new Response(JSON.stringify({ error: stockUpdateError?.message || 'Failed to update product stock.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      }
    }

    // Insert payments and apply each to income + account balances
    for (const p of payments) {
      const account_id = p.account_id;
      const amount = Number(p.amount);
      if (!account_id || !Number.isFinite(amount) || amount <= 0) continue;

      const { error: payInsertErr } = await supabaseServiceRole
        .from('sale_payments')
        .insert({
          sale_id,
          account_id,
          amount,
          payment_method: payment_method || 'Split',
        });

      if (payInsertErr) {
        console.error("[record-daily-sale] Error inserting sale_payment:", payInsertErr);
        return new Response(JSON.stringify({ error: payInsertErr?.message || 'Failed to record sale payment.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const { error: incomeError } = await supabaseServiceRole
        .from('income_transactions')
        .insert({
          profile_id: user.id,
          account_id,
          amount,
          source: `Daily Sale: ${sale_id}`,
          date: sale_date,
        });

      if (incomeError) {
        console.error("[record-daily-sale] Error recording income transaction:", incomeError);
        return new Response(JSON.stringify({ error: incomeError?.message || 'Failed to record income transaction.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const { data: accountData, error: fetchAccountError } = await supabaseServiceRole
        .from('financial_accounts')
        .select('current_balance')
        .eq('id', account_id)
        .single();

      if (fetchAccountError || !accountData) {
        console.error("[record-daily-sale] Error fetching financial account for balance update:", fetchAccountError);
        return new Response(JSON.stringify({ error: fetchAccountError?.message || 'Failed to fetch financial account for balance update.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const newBalance = Number(accountData.current_balance) + amount;
      const { error: updateBalanceError } = await supabaseServiceRole
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', account_id);

      if (updateBalanceError) {
        console.error("[record-daily-sale] Error updating financial account balance:", updateBalanceError);
        return new Response(JSON.stringify({ error: updateBalanceError?.message || 'Failed to update financial account balance.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    return new Response(JSON.stringify({ message: 'Sale recorded successfully', sale_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[record-daily-sale] Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});