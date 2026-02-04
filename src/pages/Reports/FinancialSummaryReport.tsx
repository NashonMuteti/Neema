"use client";

import React from "react";
import { endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import * as XLSX from "xlsx";
import { CalendarIcon, FileSpreadsheet, Printer } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useBranding } from "@/context/BrandingContext";
import { exportMultiTableToPdf } from "@/utils/reportUtils";
import { showError } from "@/utils/toast";

type FinancialAccountRow = {
  id: string;
  name: string;
  current_balance: number;
  can_receive_payments: boolean;
};

type DebtRow = {
  id: string;
  description: string;
  customer_name: string | null;
  amount_due: number;
  status: string;
};

type IncomeRow = {
  id: string;
  amount: number;
  date: string;
};

type ExpenditureRow = {
  id: string;
  amount: number;
  date: string;
};

type SalesRow = {
  id: string;
  total_amount: number;
  sale_date: string;
};

function money(symbol: string, v: number) {
  return `${symbol}${v.toFixed(2)}`;
}

export default function FinancialSummaryReport() {
  const { currentUser } = useAuth();
  const { currency } = useSystemSettings();
  const { brandLogoUrl, tagline } = useBranding();

  const defaultRange = React.useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);

  const [accounts, setAccounts] = React.useState<FinancialAccountRow[]>([]);
  const [incomeTotal, setIncomeTotal] = React.useState(0);
  const [expenditureTotal, setExpenditureTotal] = React.useState(0);
  const [salesTotal, setSalesTotal] = React.useState(0);
  const [debtsOutstandingTotal, setDebtsOutstandingTotal] = React.useState(0);
  const [debtsOutstandingCount, setDebtsOutstandingCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const period = React.useMemo(() => {
    const from = dateRange?.from ? startOfDay(dateRange.from) : null;
    const to = dateRange?.to ? startOfDay(dateRange.to) : null;

    // Use end-exclusive to avoid timezone edge issues
    const endExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null;

    return { start: from, endExclusive };
  }, [dateRange?.from, dateRange?.to]);

  const periodLabel = React.useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";
    return `${fromStr} - ${toStr}`;
  }, [dateRange?.from, dateRange?.to]);

  const cashAtHand = React.useMemo(
    () => accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0),
    [accounts],
  );

  const netFlow = incomeTotal - expenditureTotal;

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (!period.start || !period.endExclusive) {
      setAccounts([]);
      setIncomeTotal(0);
      setExpenditureTotal(0);
      setSalesTotal(0);
      setDebtsOutstandingTotal(0);
      setDebtsOutstandingCount(0);
      setLoading(false);
      return;
    }

    try {
      const [accountsRes, incomeRes, expRes, salesRes, debtsRes] = await Promise.all([
        supabase
          .from("financial_accounts")
          .select("id, name, current_balance, can_receive_payments")
          .order("name", { ascending: true }),
        supabase
          .from("income_transactions")
          .select("id, amount, date")
          .gte("date", period.start.toISOString())
          .lt("date", period.endExclusive.toISOString()),
        supabase
          .from("expenditure_transactions")
          .select("id, amount, date")
          .gte("date", period.start.toISOString())
          .lt("date", period.endExclusive.toISOString()),
        supabase
          .from("sales_transactions")
          .select("id, total_amount, sale_date")
          .gte("sale_date", period.start.toISOString())
          .lt("sale_date", period.endExclusive.toISOString()),
        supabase
          .from("debts")
          .select("id, description, customer_name, amount_due, status")
          .in("status", ["Outstanding", "Partially Paid"]),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expRes.error) throw expRes.error;
      if (salesRes.error) throw salesRes.error;
      if (debtsRes.error) throw debtsRes.error;

      const acc = (accountsRes.data || []) as FinancialAccountRow[];
      setAccounts(acc);

      const incomes = (incomeRes.data || []) as IncomeRow[];
      setIncomeTotal(incomes.reduce((sum, r) => sum + (r.amount || 0), 0));

      const exps = (expRes.data || []) as ExpenditureRow[];
      setExpenditureTotal(exps.reduce((sum, r) => sum + (r.amount || 0), 0));

      const sales = (salesRes.data || []) as SalesRow[];
      setSalesTotal(sales.reduce((sum, r) => sum + (r.total_amount || 0), 0));

      const debts = (debtsRes.data || []) as DebtRow[];
      const dueTotal = debts.reduce((sum, d) => sum + (d.amount_due || 0), 0);
      setDebtsOutstandingTotal(dueTotal);
      setDebtsOutstandingCount(debts.length);

      setLoading(false);
    } catch (e: any) {
      console.error("Failed to load financial summary report:", e);
      setError(e?.message || "Failed to load report.");
      showError(e?.message || "Failed to load report.");
      setLoading(false);
    }
  }, [currentUser, period.endExclusive, period.start]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const exportPdf = async () => {
    const subtitle = `Period: ${periodLabel} • prepared by: ${currentUser?.name || "-"}`;

    const summaryRows: Array<Array<string | number>> = [
      ["Cash at hand (current)", money(currency.symbol, cashAtHand)],
      ["Income (period)", money(currency.symbol, incomeTotal)],
      ["Expenditure (period)", money(currency.symbol, expenditureTotal)],
      ["Net cashflow (period)", money(currency.symbol, netFlow)],
      ["Sales total (period)", money(currency.symbol, salesTotal)],
      ["Debts outstanding (current)", money(currency.symbol, debtsOutstandingTotal)],
    ];

    const accountsRows = accounts.map((a) => [
      a.name,
      money(currency.symbol, a.current_balance || 0),
      a.can_receive_payments ? "Yes" : "No",
    ]);

    accountsRows.push(["TOTAL", money(currency.symbol, cashAtHand), ""]);

    await exportMultiTableToPdf({
      title: "Financial Summary Report",
      subtitle,
      fileName: `Financial_Summary_${periodLabel}`,
      brandLogoUrl,
      tagline,
      mode: "open",
      orientation: "auto",
      tables: [
        {
          title: "Summary",
          columns: ["Metric", "Value"],
          rows: summaryRows,
        },
        {
          title: "Accounts (current balances)",
          columns: ["Account", "Balance", "Can receive payments"],
          rows: accountsRows,
        },
      ],
    });
  };

  const exportExcel = () => {
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ["Financial Summary Report"],
      [`Period: ${periodLabel}`],
      [`prepared by: ${currentUser?.name || "-"}`],
      [],
      ["Metric", "Value"],
      ["Cash at hand (current)", cashAtHand],
      ["Income (period)", incomeTotal],
      ["Expenditure (period)", expenditureTotal],
      ["Net cashflow (period)", netFlow],
      ["Sales total (period)", salesTotal],
      ["Debts outstanding (current)", debtsOutstandingTotal],
      [],
      ["Debts count (current)", debtsOutstandingCount],
    ]);

    const wsAccounts = XLSX.utils.json_to_sheet(
      accounts.map((a) => ({
        account: a.name,
        balance: a.current_balance || 0,
        can_receive_payments: a.can_receive_payments ? "Yes" : "No",
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsAccounts, "Accounts");

    XLSX.writeFile(wb, `Financial_Summary_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Financial Summary Report</h1>
        <p className="text-lg text-muted-foreground">Loading report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Financial Summary Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Summary Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Period: {periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={exportPdf}>
            <Printer className="mr-2 h-4 w-4" /> Print (PDF)
          </Button>
          <Button onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label>Period</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Badge variant="secondary" className="font-semibold">
              Net cashflow: <span className={netFlow >= 0 ? "text-emerald-700" : "text-rose-700"}>{money(currency.symbol, netFlow)}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-amber-500/40 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cash at hand (current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-800">{money(currency.symbol, cashAtHand)}</div>
            <p className="text-xs text-muted-foreground">Sum of all account balances.</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Income (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-700">{money(currency.symbol, incomeTotal)}</div>
            <p className="text-xs text-muted-foreground">All income transactions in the selected period.</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Expenditure (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-700">{money(currency.symbol, expenditureTotal)}</div>
            <p className="text-xs text-muted-foreground">All expenditure transactions in the selected period.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts (current balances)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-right font-semibold">{money(currency.symbol, a.current_balance || 0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell className="font-extrabold">TOTAL</TableCell>
                  <TableCell className="text-right font-extrabold text-primary">{money(currency.symbol, cashAtHand)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk & obligations (current)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border bg-amber-50/60 p-3">
              <div>
                <div className="text-sm font-semibold">Outstanding debts</div>
                <div className="text-xs text-muted-foreground">Count: {debtsOutstandingCount}</div>
              </div>
              <div className="text-lg font-extrabold text-amber-700">{money(currency.symbol, debtsOutstandingTotal)}</div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Sales (period)</div>
                <div className="text-lg font-bold">{money(currency.symbol, salesTotal)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Net cashflow (period)</div>
                <div className={"text-lg font-extrabold " + (netFlow >= 0 ? "text-emerald-700" : "text-rose-700")}>
                  {money(currency.symbol, netFlow)}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Use the Detailed report for the full transaction list (income/expenditure/sales/pledges).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}