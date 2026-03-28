"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQueryClient } from "@tanstack/react-query";

import SaleForm, {
  EditableSale,
  SaleFormPayload,
  SaleFormPayment,
} from "@/components/sales-management/SaleForm";
import SalesTable, { SaleTransactionRow } from "@/components/sales-management/SalesTable";
import ReportActions from "@/components/reports/ReportActions";
import DateRangePicker from "@/components/reports/DateRangePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useDebounce } from "@/hooks/use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { dismissToast, showError, showLoading, showSuccess } from "@/utils/toast";

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

interface SaleTransaction extends SaleTransactionRow, EditableSale {
  profile_id: string;
  received_into_account_id: string;
  payment_method: string;
  payments: SaleFormPayment[];
  sale_items: SaleItem[];
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
    const roleDef = definedRoles.find((role) => role.name === currentUser.role);
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
  const [editingSale, setEditingSale] = useState<SaleTransaction | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

    let accountsQuery = supabase
      .from("financial_accounts")
      .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
      .order("name", { ascending: true });

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
        sale_items(product_id, quantity, unit_price, subtotal, products(name)),
        sale_payments(account_id, amount, financial_accounts(name))
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
      total_amount: Number(sale.total_amount || 0),
      payment_method: sale.payment_method,
      received_into_account_id: sale.received_into_account_id,
      account_name: sale.financial_accounts?.name || "Unknown Account",
      notes: sale.notes || undefined,
      profile_id: sale.profile_id,
      sale_items: (sale.sale_items || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || "Unknown Product",
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        subtotal: Number(item.subtotal || 0),
      })),
      payments: (sale.sale_payments || []).map((payment: any) => ({
        account_id: payment.account_id,
        amount: Number(payment.amount || 0),
        account_name: payment.financial_accounts?.name || "Unknown Account",
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

  const invokeSaleAction = async (
    body: Record<string, unknown>,
    loadingMessage: string,
    successMessage: string,
  ) => {
    if (!currentUser || !session) {
      showError("You must be logged in to manage sales.");
      return false;
    }

    setIsProcessing(true);
    const toastId = showLoading(loadingMessage);

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke("record-daily-sale", {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (edgeFunctionError) {
        console.error("Error from Edge Function:", edgeFunctionError);
        showError(`Failed to manage sale: ${edgeFunctionError.message}`);
        return false;
      }

      if (data?.error) {
        console.error("Error from Edge Function response:", data.error);
        showError(`Failed to manage sale: ${data.error}`);
        return false;
      }

      showSuccess(successMessage);
      await fetchAll();
      invalidateDashboardQueries();
      return true;
    } catch (err: any) {
      console.error("Unexpected error managing sale:", err);
      showError(`An unexpected error occurred: ${err.message || "Please try again."}`);
      return false;
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  const handleRecordSale = async (payload: SaleFormPayload) => {
    if (!canManageDailySales) {
      showError("You do not have permission to record sales.");
      return;
    }

    const action = editingSale ? "update" : "create";
    const ok = await invokeSaleAction(
      {
        action,
        sale_id: editingSale?.id,
        ...payload,
      },
      editingSale ? "Updating sale..." : "Recording sale...",
      editingSale ? "Sale updated successfully!" : "Sale recorded successfully!",
    );

    if (ok && editingSale) {
      setEditingSale(null);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    if (!canManageDailySales) {
      showError("You do not have permission to delete sales.");
      return;
    }

    const ok = await invokeSaleAction(
      {
        action: "delete",
        sale_id: saleToDelete.id,
      },
      "Deleting sale...",
      "Sale deleted successfully!",
    );

    if (ok) {
      if (editingSale?.id === saleToDelete.id) {
        setEditingSale(null);
      }
      setSaleToDelete(null);
    }
  };

  const reportSubtitle = useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";

    const accountName =
      accountId === "All" ? "All Accounts" : financialAccounts.find((account) => account.id === accountId)?.name || "Account";

    const parts = [`Date: ${fromStr} → ${toStr}`, accountName];
    if (!isAdmin) parts.push("My Sales");
    const q = debouncedSearchQuery.trim();
    if (q) parts.push(`Search: ${q}`);
    if (minTotal) parts.push(`Min: ${currency.symbol}${minTotal}`);
    if (maxTotal) parts.push(`Max: ${currency.symbol}${maxTotal}`);
    return parts.join(" • ");
  }, [dateRange?.from, dateRange?.to, accountId, isAdmin, debouncedSearchQuery, minTotal, maxTotal, financialAccounts, currency.symbol]);

  const reportRows = useMemo(() => {
    const base = salesTransactions.map((sale) => [
      format(sale.sale_date, "MMM dd, yyyy"),
      sale.customer_name || "-",
      sale.notes || "-",
      sale.account_name,
      `${currency.symbol}${sale.total_amount.toFixed(2)}`,
    ]);

    const total = salesTransactions.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    return [...base, ["TOTAL", "", "", "", `${currency.symbol}${total.toFixed(2)}`]];
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
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
        <p className="text-lg text-muted-foreground">Record and track daily sales transactions.</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SaleForm
              products={products}
              financialAccounts={financialAccounts}
              canManageDailySales={canManageDailySales}
              isProcessing={isProcessing}
              editingSale={editingSale}
              onCancelEdit={() => setEditingSale(null)}
              onRecordSale={handleRecordSale}
            />
          </div>

          <div className="lg:col-span-2">
            <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Sales Transactions</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{reportSubtitle}</p>
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
                  <div className="grid min-w-[260px] gap-1.5">
                    <Label>Date range</Label>
                    <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
                  </div>

                  <div className="grid min-w-[220px] gap-1.5">
                    <Label>Account</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="All">All accounts</SelectItem>
                          {financialAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid min-w-[120px] gap-1.5">
                    <Label>Min</Label>
                    <Input value={minTotal} onChange={(e) => setMinTotal(e.target.value)} placeholder="0" type="number" step="0.01" />
                  </div>

                  <div className="grid min-w-[120px] gap-1.5">
                    <Label>Max</Label>
                    <Input value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} placeholder="0" type="number" step="0.01" />
                  </div>

                  <div className="grid min-w-[220px] flex-1 gap-1.5">
                    <Label>Search</Label>
                    <Input
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                      placeholder="Customer or notes..."
                    />
                  </div>
                </div>

                <SalesTable
                  salesTransactions={salesTransactions}
                  canManageDailySales={canManageDailySales}
                  isProcessing={isProcessing}
                  onEditSale={(sale) => setEditingSale(sale as SaleTransaction)}
                  onDeleteSale={(sale) => setSaleToDelete(sale as SaleTransaction)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the sale and reverse its stock and account balance effects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
