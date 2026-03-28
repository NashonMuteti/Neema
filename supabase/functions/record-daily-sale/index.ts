import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "record-daily-sale";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
};

type PaymentInput = {
  account_id: string;
  amount: number;
};

type ExistingSale = {
  id: string;
  profile_id: string;
  customer_name: string | null;
  sale_date: string;
  total_amount: number;
  payment_method: string;
  received_into_account_id: string | null;
  notes: string | null;
  sale_items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  sale_payments: Array<{
    account_id: string;
    amount: number;
  }>;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status: number) => jsonResponse({ error: message }, status);

const getServiceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const toIdTotals = (entries: Array<{ id: string; amount: number }>) => {
  const totals = new Map<string, number>();
  entries.forEach((entry) => {
    totals.set(entry.id, (totals.get(entry.id) || 0) + entry.amount);
  });
  return totals;
};

const buildSaleIncomeSource = (saleId: string, customerName: string | null | undefined, itemLabels: string[]) => {
  const customerLabel = String(customerName || "").trim() || "Walk-in";
  const itemsSummary = itemLabels.length
    ? `Items: ${itemLabels.slice(0, 3).join(", ")}${itemLabels.length > 3 ? ` +${itemLabels.length - 3} more` : ""}`
    : "";

  return [
    `Sale: ${customerLabel}`,
    itemsSummary,
    `[sale:${saleId}]`,
  ]
    .filter(Boolean)
    .join(" • ");
};

const buildNotesWithDiscount = (notes: string | null, discount: number) => {
  const trimmedNotes = (notes || "").replace(DISCOUNT_NOTE_REGEX, "").trim();
  const discountNote = discount > 0 ? `Discount: $${discount.toFixed(2)}` : "";
  return [trimmedNotes, discountNote].filter(Boolean).join("\n") || null;
};

const DISCOUNT_NOTE_REGEX = /(?:^|\n)Discount:\s*[A-Z]{0,3}?\$?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i;

const getCurrentUserContext = async (supabaseServiceRole: ReturnType<typeof getServiceClient>, token: string) => {
  const {
    data: { user },
    error: authError,
  } = await supabaseServiceRole.auth.getUser(token);

  if (authError || !user) {
    console.error(`[${FUNCTION_NAME}] Auth error`, { message: authError?.message });
    return { error: errorResponse("Unauthorized: Invalid or expired token", 401) };
  }

  const { data: profile, error: profileError } = await supabaseServiceRole
    .from("profiles")
    .select("id, role, status, enable_login")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error(`[${FUNCTION_NAME}] Profile lookup failed`, { message: profileError?.message, userId: user.id });
    return { error: errorResponse("Forbidden: User profile not found or access denied", 403) };
  }

  const { data: roleRow, error: roleError } = await supabaseServiceRole
    .from("roles")
    .select("menu_privileges")
    .eq("name", profile.role)
    .maybeSingle();

  if (roleError) {
    console.error(`[${FUNCTION_NAME}] Role lookup failed`, { message: roleError.message, role: profile.role });
    return { error: errorResponse("Forbidden: Could not validate user privileges", 403) };
  }

  const menuPrivileges = roleRow?.menu_privileges || [];
  const isAdmin = profile.role === "Admin" || profile.role === "Super Admin";
  const canManageDailySales =
    profile.status === "Active" &&
    profile.enable_login === true &&
    (isAdmin || menuPrivileges.includes("Manage Daily Sales"));

  if (!canManageDailySales) {
    console.warn(`[${FUNCTION_NAME}] Insufficient privileges`, { userId: user.id, role: profile.role });
    return { error: errorResponse("Forbidden: Insufficient privileges to manage daily sales", 403) };
  }

  return {
    user,
    profile,
    isAdmin,
  };
};

const fetchExistingSale = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  saleId: string,
  actorUserId: string,
  isAdmin: boolean,
): Promise<ExistingSale | null> => {
  const { data: sale, error: saleError } = await supabaseServiceRole
    .from("sales_transactions")
    .select("id, profile_id, customer_name, sale_date, total_amount, payment_method, received_into_account_id, notes")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    console.error(`[${FUNCTION_NAME}] Existing sale lookup failed`, { message: saleError?.message, saleId });
    return null;
  }

  if (!isAdmin && sale.profile_id !== actorUserId) {
    console.warn(`[${FUNCTION_NAME}] Unauthorized sale access blocked`, { actorUserId, saleId, ownerId: sale.profile_id });
    return null;
  }

  const { data: saleItems, error: saleItemsError } = await supabaseServiceRole
    .from("sale_items")
    .select("product_id, quantity, unit_price, subtotal")
    .eq("sale_id", saleId);

  if (saleItemsError) {
    console.error(`[${FUNCTION_NAME}] Sale items lookup failed`, { message: saleItemsError.message, saleId });
    return null;
  }

  const { data: salePayments, error: salePaymentsError } = await supabaseServiceRole
    .from("sale_payments")
    .select("account_id, amount")
    .eq("sale_id", saleId);

  if (salePaymentsError) {
    console.error(`[${FUNCTION_NAME}] Sale payments lookup failed`, { message: salePaymentsError.message, saleId });
    return null;
  }

  return {
    ...sale,
    total_amount: Number(sale.total_amount || 0),
    sale_items: (saleItems || []).map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      subtotal: Number(item.subtotal || 0),
    })),
    sale_payments: (salePayments || []).map((payment) => ({
      account_id: payment.account_id,
      amount: Number(payment.amount || 0),
    })),
  };
};

const deleteTrackedIncomeTransactions = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  saleId: string,
  saleProfileId: string,
) => {
  const shortSaleId = saleId.slice(0, 8);
  const { error } = await supabaseServiceRole
    .from("income_transactions")
    .delete()
    .eq("profile_id", saleProfileId)
    .or(`source.ilike.%[sale:${saleId}]%,source.ilike.%#${shortSaleId}%`);

  if (error) {
    console.error(`[${FUNCTION_NAME}] Failed to delete linked income transactions`, {
      message: error.message,
      saleId,
    });
    throw new Error(error.message);
  }
};

const applyProductStocks = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  items: SaleItemInput[],
  previousItems: ExistingSale["sale_items"],
) => {
  const allProductIds = Array.from(new Set([...items.map((item) => item.product_id), ...previousItems.map((item) => item.product_id)]));

  if (allProductIds.length === 0) return [];

  const { data: products, error } = await supabaseServiceRole
    .from("products")
    .select("id, name, current_stock")
    .in("id", allProductIds);

  if (error) {
    console.error(`[${FUNCTION_NAME}] Failed to fetch products`, { message: error.message, allProductIds });
    throw new Error(error.message);
  }

  const productMap = new Map((products || []).map((product) => [product.id, product]));
  const oldQuantities = toIdTotals(previousItems.map((item) => ({ id: item.product_id, amount: item.quantity })));
  const newQuantities = toIdTotals(items.map((item) => ({ id: item.product_id, amount: item.quantity })));
  const itemLabels: string[] = [];

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new Error(`Product with ID ${item.product_id} not found.`);
    }
    itemLabels.push(`${item.quantity}× ${product.name}`);
  }

  for (const productId of allProductIds) {
    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`Product with ID ${productId} not found.`);
    }

    const oldQuantity = oldQuantities.get(productId) || 0;
    const newQuantity = newQuantities.get(productId) || 0;
    const availableStock = Number(product.current_stock || 0) + oldQuantity;

    if (newQuantity > availableStock) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
    }

    const nextStock = availableStock - newQuantity;
    const { error: updateError } = await supabaseServiceRole
      .from("products")
      .update({ current_stock: nextStock })
      .eq("id", productId);

    if (updateError) {
      console.error(`[${FUNCTION_NAME}] Failed to update product stock`, {
        message: updateError.message,
        productId,
      });
      throw new Error(updateError.message);
    }
  }

  return itemLabels;
};

const applyAccountBalances = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  payments: PaymentInput[],
  previousPayments: ExistingSale["sale_payments"],
  actorUserId: string,
  isAdmin: boolean,
) => {
  const allAccountIds = Array.from(new Set([...payments.map((payment) => payment.account_id), ...previousPayments.map((payment) => payment.account_id)]));

  if (allAccountIds.length === 0) return;

  const { data: accounts, error } = await supabaseServiceRole
    .from("financial_accounts")
    .select("id, profile_id, current_balance")
    .in("id", allAccountIds);

  if (error) {
    console.error(`[${FUNCTION_NAME}] Failed to fetch financial accounts`, { message: error.message, allAccountIds });
    throw new Error(error.message);
  }

  const accountMap = new Map((accounts || []).map((account) => [account.id, account]));
  const oldTotals = toIdTotals(previousPayments.map((payment) => ({ id: payment.account_id, amount: payment.amount })));
  const newTotals = toIdTotals(payments.map((payment) => ({ id: payment.account_id, amount: payment.amount })));

  for (const accountId of allAccountIds) {
    const account = accountMap.get(accountId);
    if (!account) {
      throw new Error(`Financial account with ID ${accountId} not found.`);
    }

    if (!isAdmin && account.profile_id !== actorUserId) {
      throw new Error("You can only receive sales payments into your own accounts.");
    }

    const oldAmount = oldTotals.get(accountId) || 0;
    const newAmount = newTotals.get(accountId) || 0;
    const nextBalance = Number(account.current_balance || 0) - oldAmount + newAmount;

    const { error: updateError } = await supabaseServiceRole
      .from("financial_accounts")
      .update({ current_balance: nextBalance })
      .eq("id", accountId);

    if (updateError) {
      console.error(`[${FUNCTION_NAME}] Failed to update account balance`, {
        message: updateError.message,
        accountId,
      });
      throw new Error(updateError.message);
    }
  }
};

const insertSaleItems = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  saleId: string,
  items: SaleItemInput[],
) => {
  if (items.length === 0) return;

  const rows = items.map((item) => ({
    sale_id: saleId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price,
  }));

  const { error } = await supabaseServiceRole.from("sale_items").insert(rows);
  if (error) {
    console.error(`[${FUNCTION_NAME}] Failed to insert sale items`, { message: error.message, saleId });
    throw new Error(error.message);
  }
};

const insertSalePaymentsAndIncome = async (
  supabaseServiceRole: ReturnType<typeof getServiceClient>,
  saleId: string,
  saleProfileId: string,
  saleDate: string,
  paymentMethod: string,
  customerName: string | null | undefined,
  payments: PaymentInput[],
  itemLabels: string[],
) => {
  if (payments.length === 0) return;

  const incomeSource = buildSaleIncomeSource(saleId, customerName, itemLabels);

  const paymentRows = payments.map((payment) => ({
    sale_id: saleId,
    account_id: payment.account_id,
    amount: payment.amount,
    payment_method: paymentMethod,
  }));

  const { error: paymentsError } = await supabaseServiceRole.from("sale_payments").insert(paymentRows);
  if (paymentsError) {
    console.error(`[${FUNCTION_NAME}] Failed to insert sale payments`, { message: paymentsError.message, saleId });
    throw new Error(paymentsError.message);
  }

  const incomeRows = payments.map((payment) => ({
    profile_id: saleProfileId,
    account_id: payment.account_id,
    amount: payment.amount,
    source: incomeSource,
    date: saleDate,
  }));

  const { error: incomeError } = await supabaseServiceRole.from("income_transactions").insert(incomeRows);
  if (incomeError) {
    console.error(`[${FUNCTION_NAME}] Failed to insert income transactions`, { message: incomeError.message, saleId });
    throw new Error(incomeError.message);
  }
};

const validateInputs = (saleItemsRaw: unknown, paymentsRaw: unknown, discountRaw: unknown) => {
  if (!Array.isArray(saleItemsRaw) || saleItemsRaw.length === 0) {
    throw new Error("No sale items provided.");
  }

  if (!Array.isArray(paymentsRaw) || paymentsRaw.length === 0) {
    throw new Error("No payments provided.");
  }

  const saleItems = saleItemsRaw.map((item) => ({
    product_id: typeof item?.product_id === "string" ? item.product_id : "",
    quantity: Number(item?.quantity),
    unit_price: Number(item?.unit_price),
  }));

  const payments = paymentsRaw
    .map((payment) => ({
      account_id: typeof payment?.account_id === "string" ? payment.account_id : "",
      amount: Number(payment?.amount),
    }))
    .filter((payment) => payment.account_id && Number.isFinite(payment.amount) && payment.amount > 0);

  const discount = Number(discountRaw || 0);

  for (const item of saleItems) {
    if (!item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price <= 0) {
      throw new Error("Invalid sale item data.");
    }
  }

  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("Discount must be a non-negative number.");
  }

  if (payments.length === 0) {
    throw new Error("At least one valid payment is required.");
  }

  const totalAmount = saleItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (totalPaid <= 0) {
    throw new Error("Total paid must be greater than 0.");
  }

  if (totalPaid + discount - totalAmount > 0.00001) {
    throw new Error("Received total plus discount cannot exceed sale total.");
  }

  if (Math.abs(totalPaid + discount - totalAmount) > 0.00001) {
    throw new Error("Received total plus discount must exactly match the sale total.");
  }

  return {
    saleItems,
    payments,
    discount,
    totalAmount,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(`[${FUNCTION_NAME}] Missing or invalid authorization header`);
      return errorResponse("Unauthorized: Missing Authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseServiceRole = getServiceClient();

    const userContext = await getCurrentUserContext(supabaseServiceRole, token);
    if ("error" in userContext) {
      return userContext.error;
    }

    const { user, isAdmin } = userContext;
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "create";
    const saleId = typeof body?.sale_id === "string" ? body.sale_id : "";

    if (action === "delete") {
      if (!saleId) {
        return errorResponse("Bad Request: sale_id is required", 400);
      }

      const existingSale = await fetchExistingSale(supabaseServiceRole, saleId, user.id, isAdmin);
      if (!existingSale) {
        return errorResponse("Sale not found or access denied.", 404);
      }

      await applyProductStocks(supabaseServiceRole, [], existingSale.sale_items);
      await applyAccountBalances(supabaseServiceRole, [], existingSale.sale_payments, user.id, isAdmin);
      await deleteTrackedIncomeTransactions(supabaseServiceRole, existingSale.id, existingSale.profile_id);

      const { error: deletePaymentsError } = await supabaseServiceRole.from("sale_payments").delete().eq("sale_id", existingSale.id);
      if (deletePaymentsError) {
        console.error(`[${FUNCTION_NAME}] Failed to delete sale payments`, { message: deletePaymentsError.message, saleId });
        return errorResponse(deletePaymentsError.message, 500);
      }

      const { error: deleteItemsError } = await supabaseServiceRole.from("sale_items").delete().eq("sale_id", existingSale.id);
      if (deleteItemsError) {
        console.error(`[${FUNCTION_NAME}] Failed to delete sale items`, { message: deleteItemsError.message, saleId });
        return errorResponse(deleteItemsError.message, 500);
      }

      const { error: deleteSaleError } = await supabaseServiceRole.from("sales_transactions").delete().eq("id", existingSale.id);
      if (deleteSaleError) {
        console.error(`[${FUNCTION_NAME}] Failed to delete sale transaction`, { message: deleteSaleError.message, saleId });
        return errorResponse(deleteSaleError.message, 500);
      }

      return jsonResponse({ message: "Sale deleted successfully", sale_id: existingSale.id });
    }

    const customerName = typeof body?.customer_name === "string" ? body.customer_name : null;
    const saleDate = typeof body?.sale_date === "string" ? body.sale_date : new Date().toISOString();
    const paymentMethod = typeof body?.payment_method === "string" && body.payment_method ? body.payment_method : "Split";
    const receivedIntoAccountId = typeof body?.received_into_account_id === "string" ? body.received_into_account_id : null;
    const notes = typeof body?.notes === "string" ? body.notes : null;

    const { saleItems, payments, totalAmount, discount } = validateInputs(body?.sale_items, body?.payments, body?.discount);
    const finalNotes = buildNotesWithDiscount(notes, discount);

    if (action === "update") {
      if (!saleId) {
        return errorResponse("Bad Request: sale_id is required", 400);
      }

      const existingSale = await fetchExistingSale(supabaseServiceRole, saleId, user.id, isAdmin);
      if (!existingSale) {
        return errorResponse("Sale not found or access denied.", 404);
      }

      const primaryAccountId = receivedIntoAccountId || payments[0]?.account_id || null;
      const itemLabels = await applyProductStocks(supabaseServiceRole, saleItems, existingSale.sale_items);
      await applyAccountBalances(supabaseServiceRole, payments, existingSale.sale_payments, user.id, isAdmin);
      await deleteTrackedIncomeTransactions(supabaseServiceRole, existingSale.id, existingSale.profile_id);

      const { error: deletePaymentsError } = await supabaseServiceRole.from("sale_payments").delete().eq("sale_id", existingSale.id);
      if (deletePaymentsError) {
        console.error(`[${FUNCTION_NAME}] Failed to delete old sale payments`, { message: deletePaymentsError.message, saleId });
        return errorResponse(deletePaymentsError.message, 500);
      }

      const { error: deleteItemsError } = await supabaseServiceRole.from("sale_items").delete().eq("sale_id", existingSale.id);
      if (deleteItemsError) {
        console.error(`[${FUNCTION_NAME}] Failed to delete old sale items`, { message: deleteItemsError.message, saleId });
        return errorResponse(deleteItemsError.message, 500);
      }

      const { error: updateSaleError } = await supabaseServiceRole
        .from("sales_transactions")
        .update({
          customer_name: customerName,
          sale_date: saleDate,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          received_into_account_id: primaryAccountId,
          notes: finalNotes,
        })
        .eq("id", existingSale.id);

      if (updateSaleError) {
        console.error(`[${FUNCTION_NAME}] Failed to update sale transaction`, { message: updateSaleError.message, saleId });
        return errorResponse(updateSaleError.message, 500);
      }

      await insertSaleItems(supabaseServiceRole, existingSale.id, saleItems);
      await insertSalePaymentsAndIncome(
        supabaseServiceRole,
        existingSale.id,
        existingSale.profile_id,
        saleDate,
        paymentMethod,
        customerName,
        payments,
        itemLabels,
      );

      return jsonResponse({ message: "Sale updated successfully", sale_id: existingSale.id });
    }

    const primaryAccountId = receivedIntoAccountId || payments[0]?.account_id || null;
    const itemLabels = await applyProductStocks(supabaseServiceRole, saleItems, []);
    await applyAccountBalances(supabaseServiceRole, payments, [], user.id, isAdmin);

    const { data: saleData, error: saleError } = await supabaseServiceRole
      .from("sales_transactions")
      .insert({
        profile_id: user.id,
        customer_name: customerName,
        sale_date: saleDate,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        received_into_account_id: primaryAccountId,
        notes: finalNotes,
      })
      .select("id")
      .single();

    if (saleError || !saleData) {
      console.error(`[${FUNCTION_NAME}] Failed to create sale transaction`, { message: saleError?.message });
      return errorResponse(saleError?.message || "Failed to create sale transaction.", 500);
    }

    await insertSaleItems(supabaseServiceRole, saleData.id, saleItems);
    await insertSalePaymentsAndIncome(
      supabaseServiceRole,
      saleData.id,
      user.id,
      saleDate,
      paymentMethod,
      customerName,
      payments,
      itemLabels,
    );

    return jsonResponse({ message: "Sale recorded successfully", sale_id: saleData.id });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Unexpected error`, { error: error instanceof Error ? error.message : error });
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 500);
  }
});