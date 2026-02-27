"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, format, parseISO, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

import SaleForm from "@/components/sales-management/SaleForm";
import SalesTable, { SaleTransactionRow } from "@/components/sales-management/SalesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/reports/DateRangePicker";
import ReportActions from "@/components/reports/ReportActions";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useDebounce } from "@/hooks/use-debounce";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number;
}

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
  initial_balance: number;
  profile_id: string;
  can_receive_payments: boolean;
}

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleTransaction extends SaleTransactionRow {
  profile_id: string;
  received_into_account_id: string;
  payment_method: string;
}

export default function DailySales() {
  const { currentUser, session } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const { canManageDailySales } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageDailySales: false };
    }
    const roleDef = definedRoles.find((r) => r.name === currentUser.role);
    const privileges = roleDef?.menuPrivileges || [];
    return { canManageDailySales: privileges.includes("Manage Daily Sales") };
  }, [currentUser, definedRoles]);

  const defaultRange = useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [accountId, setAccountId] = useState<string>("All");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 400);
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, current_stock")
      .order("name", { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      showError("Failed to load products.");
      setProducts([]);
    } else {
      setProducts(productsData || []);
    }

    // Accounts
    let accountsQuery = supabase
      .from("financial_accounts")
      .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
      .order("name", { ascending: true });

    // Keep form usable for non-admins (only their accounts). Admins can still see all for filtering.
    if (!isAdmin) {
      accountsQuery = accountsQuery.eq("profile_id", currentUser.id);
    }

    const { data: accountsData, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
      setFinancialAccounts([]);
    } else {
      setFinancialAccounts(accountsData || []);
    }

    const from = dateRange?.from ? startOfDay(dateRange.from) : null;
    const to = dateRange?.to ? endOfDay(dateRange.to) : null;

    if (!from || !to) {
      setSalesTransactions([]);
      setLoading(false);
      return;
    }

    let salesQuery = supabase
      .from("sales_transactions")
      .select(
        `
        id,
        customer_name,
        sale_date,
        total_amount,
        payment_method,
        received_into_account_id,
        notes,
        profile_id,
        financial_accounts(name),
        sale_items(product_id, quantity, unit_price, subtotal, products(name))
      `,
      )
      .gte("sale_date", from.toISOString())
      .lte("sale_date", to.toISOString());

    if (!isAdmin) {
      salesQuery = salesQuery.eq("profile_id", currentUser.id);
    }

    if (accountId !== "All") {
      salesQuery = salesQuery.eq("received_into_account_id", accountId);
    }

    const q = debouncedSearchQuery.trim();
    if (q) {
      salesQuery = salesQuery.or(`customer_name.ilike.%${q}%,notes.ilike.%${q}%`);
    }

    const min = minTotal ? Number(minTotal) : null;
    const max = maxTotal ? Number(maxTotal) : null;
    if (min !== null && Number.isFinite(min)) salesQuery = salesQuery.gte("total_amount", min);
    if (max !== null && Number.isFinite(max)) salesQuery = salesQuery.lte("total_amount", max);

    const { data: salesData, error: salesError } = await salesQuery.order("sale_date", { ascending: false });

    if (salesError) {
      console.error("Error fetching sales transactions:", salesError);
      setError("Failed to load sales transactions.");
      showError("Failed to load sales transactions.");
      setSalesTransactions([]);
      setLoading(false);
      return;
    }

    const fetchedSales: SaleTransaction[] = (salesData || []).map((sale: any) => ({
      id: sale.id,
      customer_name: sale.customer_name || undefined,
      sale_date: parseISO(sale.sale_date),
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      received_into_account_id: sale.received_into_account_id,
      account_name: sale.financial_accounts?.name || "Unknown Account",
      notes: sale.notes || undefined,
      profile_id: sale.profile_id,
      sale_items: (sale.sale_items || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || "Unknown Product",
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
    }));

    setSalesTransactions(fetchedSales);
    setLoading(false);
  }, [currentUser, isAdmin, dateRange?.from, dateRange?.to, accountId, debouncedSearchQuery, minTotal, maxTotal]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
    queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
  };

  const handleRecordSale = async (payload: {
    customer_name?: string;
    sale_date: string;
    payment_method: string;
    received_into_account_id: string;
    notes?: string;
    sale_items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }) => {
    if (!canManageDailySales) {
      showError("You do not have permission to record sales.");
      return;
    }
    if (!currentUser || !session) {
      showError("You must be logged in to record a sale.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading("Recording sale...");

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke("record-daily-sale", {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (edgeFunctionError) {
        console.error("Error from Edge Function:", edgeFunctionError);
        showError(`Failed to record sale: ${edgeFunctionError.message}`);
        return;
      }
      if (data?.error) {
        console.error("Error from Edge Function response:", data.error);
        showError(`Failed to record sale: ${data.error}`);
        return;
      }

      showSuccess("Sale recorded successfully!");
      fetchAll();
      invalidateDashboardQueries();
    } catch (err: any) {
      console.error("Unexpected error recording sale:", err);
      showError(`An unexpected error occurred: ${err.message || "Please try again."}`);
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  const reportSubtitle = useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";

    const accountName =
      accountId === "All" ? "All Accounts" : financialAccounts.find((a) => a.id === accountId)?.name || "Account";

    const parts = [`Date: ${fromStr} → ${toStr}`, accountName];
    if (!isAdmin) parts.push("My Sales");
    const q = debouncedSearchQuery.trim();
    if (q) parts.push(`Search: ${q}`);
    if (minTotal) parts.push(`Min: ${currency.symbol}${minTotal}`);
    if (maxTotal) parts.push(`Max: ${currency.symbol}${maxTotal}`);
    return parts.join(" • ");
  }, [dateRange?.from, dateRange?.to, accountId, isAdmin, debouncedSearchQuery, minTotal, maxTotal, financialAccounts, currency.symbol]);

  const reportRows = useMemo(() => {
    return salesTransactions.map((s) => [
      format(s.sale_date, "MMM dd, yyyy"),
      s.customer_name || "-",
      s.notes || "-",
      s.account_name,
      `${currency.symbol}${s.total_amount.toFixed(2)}`,
    ]);
  }, [salesTransactions, currency.symbol]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
        <p className="text-lg text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
      <p className="text-lg text-muted-foreground">Record and track daily sales transactions.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SaleForm
            products={products}
            financialAccounts={financialAccounts}
            canManageDailySales={canManageDailySales}
            isProcessing={isProcessing}
            onRecordSale={handleRecordSale}
          />
        </div>

        <div className="lg:col-span-2">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Sales Transactions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{reportSubtitle}</p>
              </div>
              <ReportActions
                title="Sales Report"
                subtitle={reportSubtitle}
                columns={["Date", "Customer", "Notes", "Account", "Total"]}
                rows={reportRows}
                fileName={`Sales_${format(new Date(), "yyyy-MM-dd")}`}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="grid gap-1.5 min-w-[260px]">
                  <Label>Date range</Label>
                  <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[260px]" />
                </div>

                <div className="grid gap-1.5 min-w-[220px]">
                  <Label>Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="All">All accounts</SelectItem>
                        {financialAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 min-w-[120px]">
                  <Label>Min</Label>
                  <Input value={minTotal} onChange={(e) => setMinTotal(e.target.value)} placeholder="0" type="number" step="0.01" />
                </div>

                <div className="grid gap-1.5 min-w-[120px]">
                  <Label>Max</Label>
                  <Input value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} placeholder="0" type="number" step="0.01" />
                </div>

                <div className="grid gap-1.5 flex-1 min-w-[220px]">
                  <Label>Search</Label>
                  <Input
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    placeholder="Customer or notes..."
                  />
                </div>
              </div>

              <SalesTable salesTransactions={salesTransactions} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
