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
      console.error("Edge Function Auth Error:", authError?.message);
      return new Response('Unauthorized: Invalid or expired token', { status: 401, headers: corsHeaders });
    }

    // Fetch the user's role from the profiles table using the service role client
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Edge Function Profile Error:", profileError?.message);
      return new Response('Forbidden: User profile not found or access denied', { status: 403, headers: corsHeaders });
    }

    const userRole = profile.role;
    const allowedRoles = ['Admin', 'Super Admin', 'Project Manager']; // Assuming Project Manager can also manage sales

    if (!allowedRoles.includes(userRole)) {
      return new Response('Forbidden: Insufficient privileges to record sales', { status: 403, headers: corsHeaders });
    }

    const { customer_name, sale_date, payment_method, received_into_account_id, notes, sale_items } = await req.json();

    if (!sale_items || sale_items.length === 0) {
      return new Response('Bad Request: No sale items provided', { status: 400, headers: corsHeaders });
    }

    let total_amount = 0;
    const productUpdates = [];

    // Validate stock and calculate total amount
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

    // Start a transaction (conceptual, Supabase RPC handles atomicity for functions)
    // Insert into sales_transactions
    const { data: saleData, error: saleError } = await supabaseServiceRole
      .from('sales_transactions')
      .insert({
        profile_id: user.id,
        customer_name,
        sale_date,
        total_amount,
        payment_method,
        received_into_account_id,
        notes,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      console.error("Error inserting sales_transaction:", saleError);
      return new Response(JSON.stringify({ error: saleError?.message || 'Failed to create sale transaction.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const sale_id = saleData.id;

    // Insert into sale_items and update product stock
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
        console.error("Error inserting sale_item:", saleItemError);
        // Rollback logic would be here in a full transaction system
        return new Response(JSON.stringify({ error: saleItemError?.message || 'Failed to create sale item.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      // Update product stock
      const productUpdate = productUpdates.find(pu => pu.id === product_id);
      if (productUpdate) {
        const { error: stockUpdateError } = await supabaseServiceRole
          .from('products')
          .update({ current_stock: productUpdate.new_stock })
          .eq('id', product_id);

        if (stockUpdateError) {
          console.error("Error updating product stock:", stockUpdateError);
          return new Response(JSON.stringify({ error: stockUpdateError?.message || 'Failed to update product stock.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      }
    }

    // Record income transaction
    const { error: incomeError } = await supabaseServiceRole
      .from('income_transactions')
      .insert({
        profile_id: user.id,
        account_id: received_into_account_id,
        amount: total_amount,
        source: `Daily Sale: ${sale_id}`,
        date: sale_date,
      });

    if (incomeError) {
      console.error("Error recording income transaction:", incomeError);
      return new Response(JSON.stringify({ error: incomeError?.message || 'Failed to record income transaction.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Update financial account balance
    const { data: accountData, error: fetchAccountError } = await supabaseServiceRole
      .from('financial_accounts')
      .select('current_balance')
      .eq('id', received_into_account_id)
      .single();

    if (fetchAccountError || !accountData) {
      console.error("Error fetching financial account for balance update:", fetchAccountError);
      return new Response(JSON.stringify({ error: fetchAccountError?.message || 'Failed to fetch financial account for balance update.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const newBalance = accountData.current_balance + total_amount;
    const { error: updateBalanceError } = await supabaseServiceRole
      .from('financial_accounts')
      .update({ current_balance: newBalance })
      .eq('id', received_into_account_id);

    if (updateBalanceError) {
      console.error("Error updating financial account balance:", updateBalanceError);
      return new Response(JSON.stringify({ error: updateBalanceError?.message || 'Failed to update financial account balance.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Sale recorded successfully', sale_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});