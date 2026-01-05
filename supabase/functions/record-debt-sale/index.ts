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
    const allowedRoles = ['Admin', 'Super Admin', 'Project Manager']; // Assuming Project Manager can also manage sales/debts

    if (!allowedRoles.includes(userRole)) {
      return new Response('Forbidden: Insufficient privileges to record debt sales', { status: 403, headers: corsHeaders });
    }

    const { debt_data, sale_items } = await req.json();

    if (!sale_items || sale_items.length === 0) {
      return new Response('Bad Request: No sale items provided for debt sale', { status: 400, headers: corsHeaders });
    }

    let total_sale_amount = 0;
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
      total_sale_amount += subtotal;
      productUpdates.push({
        id: product_id,
        new_stock: product.current_stock - quantity,
      });
    }

    // Ensure the debt's original_amount matches the calculated total_sale_amount
    if (debt_data.original_amount !== total_sale_amount) {
      return new Response('Bad Request: Debt original amount does not match total sale items amount.', { status: 400, headers: corsHeaders });
    }

    // 1. Insert into sales_transactions (no received_into_account_id as it's a debt)
    const { data: saleData, error: saleError } = await supabaseServiceRole
      .from('sales_transactions')
      .insert({
        profile_id: user.id, // User who recorded the debt sale
        customer_name: debt_data.customer_name || debt_data.debtor_profile_id, // Use customer name or debtor ID
        sale_date: debt_data.due_date || new Date().toISOString(), // Use due_date as sale_date, or current date
        total_amount: total_sale_amount,
        payment_method: 'Debt', // Indicate it's a debt sale
        received_into_account_id: null, // No immediate cash received
        notes: debt_data.description || 'Stock sale on debt',
      })
      .select()
      .single();

    if (saleError || !saleData) {
      console.error("Error inserting sales_transaction for debt sale:", saleError);
      return new Response(JSON.stringify({ error: saleError?.message || 'Failed to create sale transaction for debt.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const sale_id = saleData.id;

    // 2. Insert into sale_items and update product stock
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
        console.error("Error inserting sale_item for debt sale:", saleItemError);
        // Rollback logic would be here in a full transaction system
        return new Response(JSON.stringify({ error: saleItemError?.message || 'Failed to create sale item for debt.' }), {
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
          console.error("Error updating product stock for debt sale:", stockUpdateError);
          return new Response(JSON.stringify({ error: stockUpdateError?.message || 'Failed to update product stock for debt.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      }
    }

    // 3. Insert into debts, linking to the new sale_id
    const { data: debtDataResponse, error: debtError } = await supabaseServiceRole
      .from('debts')
      .insert({
        created_by_profile_id: user.id,
        sale_id: sale_id,
        debtor_profile_id: debt_data.debtor_profile_id || null,
        customer_name: debt_data.customer_name || null,
        description: debt_data.description,
        original_amount: debt_data.original_amount,
        amount_due: debt_data.original_amount, // Amount due is full original amount
        due_date: debt_data.due_date?.toISOString() || null,
        status: "Outstanding",
        notes: debt_data.notes || null,
      })
      .select()
      .single();

    if (debtError || !debtDataResponse) {
      console.error("Error inserting debt for debt sale:", debtError);
      return new Response(JSON.stringify({ error: debtError?.message || 'Failed to create debt record for sale.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Debt sale recorded successfully', debt_id: debtDataResponse.id, sale_id }), {
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