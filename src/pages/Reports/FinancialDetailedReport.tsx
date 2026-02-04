"use client";

import React from "react";
import { format, getMonth, getYear } from "date-fns";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Printer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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

type IncomeRow = {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  source: string;
};

type ExpenditureRow = {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  purpose: string;
};

type SalesRow = {
  id: string;
  sale_date: string;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  notes: string | null;
  received_into_account_id: string | null;
};

type DebtRow = {
  id: string;
  description: string;
  customer_name: string | null;
  amount_due: number;
  due_date: string | null;
  status: string;
};

function money(symbol: string, v: number) {
  return `${symbol}${v.toFixed(2)}`;
}

function groupTotal<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "(Unspecified)";
    m.set(k, (m.get(k) || 0) + (value(r) || 0));
  }
  return Array.from(m.entries())
    .map(([k, total]) => ({ k, total }))
    .sort((a, b) => b.total - a.total);
}

export default function FinancialDetailedReport() {
  const { currentUser } = useAuth();
  const { currency } = useSystemSettings();
  const { brandLogoUrl, tagline } = useBranding();

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [messageToMembers, setMessageToMembers] = React.useState<string>(
    "Thank you all for your continued support. Below is the detailed financial report for accountability.",
  );

  const [accounts, setAccounts] = React.useState<FinancialAccountRow[]>([]);
  const [income, setIncome] = React.useState<IncomeRow[]>([]);
  const [expenditure, setExpenditure] = React.useState<ExpenditureRow[]>([]);
  const [sales, setSales] = React.useState<SalesRow[]>([]);
  const [debts, setDebts] = React.useState<DebtRow[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const months = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i.toString(), label: format(new Date(0, i), "MMMM") })),
    [],
  );

  const years = React.useMemo(
    () => Array.from({ length: 6 }, (_, i) => {
      const y = currentYear - 3 + i;
      return { value: y.toString(), label: y.toString() };
    }),
    [currentYear],
  );

  const period = React.useMemo(() => {
    const y = parseInt(filterYear);
    const m = parseInt(filterMonth);
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const endExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
    return { start, endExclusive };
  }, [filterYear, filterMonth]);

  const periodLabel = `${months.find((m) => m.value === filterMonth)?.label} ${filterYear}`;

  const accountNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.name);
    return m;
  }, [accounts]);

  const cashOnHand = React.useMemo(() => accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0), [accounts]);
  const incomeTotal = React.useMemo(() => income.reduce((sum, r) => sum + (r.amount || 0), 0), [income]);
  const expenditureTotal = React.useMemo(() => expenditure.reduce((sum, r) => sum + (r.amount || 0), 0), [expenditure]);
  const salesTotal = React.useMemo(() => sales.reduce((sum, r) => sum + (r.total_amount || 0), 0), [sales]);
  const debtsOutstandingTotal = React.useMemo(() => debts.reduce((sum, d) => sum + (d.amount_due || 0), 0), [debts]);

  const netFlow = incomeTotal - expenditureTotal;

  const incomeBySource = React.useMemo(
    () => groupTotal(income, (r) => r.source, (r) => r.amount).slice(0, 8),
    [income],
  );

  const expenditureByPurpose = React.useMemo(
    () => groupTotal(expenditure, (r) => r.purpose, (r) => r.amount).slice(0, 8),
    [expenditure],
  );

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const [accountsRes, incomeRes, expRes, salesRes, debtsRes] = await Promise.all([
        supabase.from("financial_accounts").select("id, name, current_balance, can_receive_payments").order("name", { ascending: true }),
        supabase
          .from("income_transactions")
          .select("id, account_id, date, amount, source")
          .gte("date", period.start.toISOString())
          .lt("date", period.endExclusive.toISOString())
          .order("date", { ascending: false }),
        supabase
          .from("expenditure_transactions")
          .select("id, account_id, date, amount, purpose")
          .gte("date", period.start.toISOString())
          .lt("date", period.endExclusive.toISOString())
          .order("date", { ascending: false }),
        supabase
          .from("sales_transactions")
          .select("id, sale_date, total_amount, payment_method, customer_name, notes, received_into_account_id")
          .gte("sale_date", period.start.toISOString())
          .lt("sale_date", period.endExclusive.toISOString())
          .order("sale_date", { ascending: false }),
        supabase
          .from("debts")
          .select("id, description, customer_name, amount_due, due_date, status")
          .in("status", ["Outstanding", "Partially Paid"])
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expRes.error) throw expRes.error;
      if (salesRes.error) throw salesRes.error;
      if (debtsRes.error) throw debtsRes.error;

      setAccounts((accountsRes.data || []) as FinancialAccountRow[]);
      setIncome((incomeRes.data || []) as IncomeRow[]);
      setExpenditure((expRes.data || []) as ExpenditureRow[]);
      setSales((salesRes.data || []) as SalesRow[]);
      setDebts((debtsRes.data || []) as DebtRow[]);

      setLoading(false);
    } catch (e: any) {
      console.error("Failed to load financial detailed report:", e);
      const msg = e?.message || "Failed to load report.";
      setError(msg);
      showError(msg);
      setLoading(false);
    }
  }, [currentUser, period.endExclusive, period.start]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const exportPdf = async () => {
    const summaryRows: Array<Array<string | number>> = [
      ["Period", periodLabel],
      ["Prepared by", currentUser?.name || ""],
      ["Cash on hand (current)", money(currency.symbol, cashOnHand)],
      ["Income (period)", money(currency.symbol, incomeTotal)],
      ["Expenditure (period)", money(currency.symbol, expenditureTotal)],
      ["Net cashflow (period)", money(currency.symbol, netFlow)],
      ["Sales total (period)", money(currency.symbol, salesTotal)],
      ["Debts outstanding (current)", money(currency.symbol, debtsOutstandingTotal)],
    ];

    const incomeRows = income.map((r) => [
      format(new Date(r.date), "yyyy-MM-dd"),
      r.source,
      accountNameById.get(r.account_id) || r.account_id,
      money(currency.symbol, r.amount || 0),
    ]);

    const expenditureRows = expenditure.map((r) => [
      format(new Date(r.date), "yyyy-MM-dd"),
      r.purpose,
      accountNameById.get(r.account_id) || r.account_id,
      money(currency.symbol, r.amount || 0),
    ]);

    const salesRows = sales.map((r) => [
      format(new Date(r.sale_date), "yyyy-MM-dd"),
      r.customer_name || "—",
      r.payment_method,
      accountNameById.get(r.received_into_account_id || "") || "—",
      money(currency.symbol, r.total_amount || 0),
      r.notes || "",
    ]);

    const debtsRows = debts.map((d) => [
      d.customer_name || "—",
      d.description,
      d.due_date ? format(new Date(d.due_date), "yyyy-MM-dd") : "—",
      d.status,
      money(currency.symbol, d.amount_due || 0),
    ]);

    await exportMultiTableToPdf({
      title: "Financial Detailed Report",
      subtitle: `Period: ${periodLabel}`,
      fileName: `Financial_Detailed_${periodLabel}`,
      brandLogoUrl,
      tagline,
      mode: "open",
      orientation: "auto",
      tables: [
        {
          title: "Executive Summary",
          columns: ["Item", "Value"],
          rows: summaryRows,
        },
        {
          title: "Message to members",
          columns: ["Note"],
          rows: [[messageToMembers]],
        },
        {
          title: `Income transactions (${income.length})`,
          columns: ["Date", "Source", "Account", "Amount"],
          rows: incomeRows.length ? incomeRows : [["—", "No income recorded", "—", "—"]],
        },
        {
          title: `Expenditure transactions (${expenditure.length})`,
          columns: ["Date", "Purpose", "Account", "Amount"],
          rows: expenditureRows.length ? expenditureRows : [["—", "No expenditure recorded", "—", "—"]],
        },
        {
          title: `Sales transactions (${sales.length})`,
          columns: ["Date", "Customer", "Method", "Account", "Total", "Notes"],
          rows: salesRows.length ? salesRows : [["—", "No sales recorded", "—", "—", "—", ""]],
        },
        {
          title: `Outstanding debts (${debts.length})`,
          columns: ["Customer", "Description", "Due date", "Status", "Amount due"],
          rows: debtsRows.length ? debtsRows : [["—", "No outstanding debts", "—", "—", "—"]],
        },
      ],
    });
  };

  const exportExcel = () => {
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ["Financial Detailed Report"],
      [`Period: ${periodLabel}`],
      [`Prepared by: ${currentUser?.name || ""}`],
      [],
      ["Metric", "Value"],
      ["Cash on hand (current)", cashOnHand],
      ["Income (period)", incomeTotal],
      ["Expenditure (period)", expenditureTotal],
      ["Net cashflow (period)", netFlow],
      ["Sales total (period)", salesTotal],
      ["Debts outstanding (current)", debtsOutstandingTotal],
      [],
      ["Message to members"],
      [messageToMembers],
    ]);

    const wsIncome = XLSX.utils.json_to_sheet(
      income.map((r) => ({
        date: format(new Date(r.date), "yyyy-MM-dd"),
        source: r.source,
        account: accountNameById.get(r.account_id) || r.account_id,
        amount: r.amount,
      })),
    );

    const wsExpenditure = XLSX.utils.json_to_sheet(
      expenditure.map((r) => ({
        date: format(new Date(r.date), "yyyy-MM-dd"),
        purpose: r.purpose,
        account: accountNameById.get(r.account_id) || r.account_id,
        amount: r.amount,
      })),
    );

    const wsSales = XLSX.utils.json_to_sheet(
      sales.map((r) => ({
        sale_date: format(new Date(r.sale_date), "yyyy-MM-dd"),
        customer: r.customer_name || "",
        payment_method: r.payment_method,
        account: accountNameById.get(r.received_into_account_id || "") || "",
        total_amount: r.total_amount,
        notes: r.notes || "",
      })),
    );

    const wsDebts = XLSX.utils.json_to_sheet(
      debts.map((d) => ({
        customer: d.customer_name || "",
        description: d.description,
        due_date: d.due_date ? format(new Date(d.due_date), "yyyy-MM-dd") : "",
        status: d.status,
        amount_due: d.amount_due,
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsIncome, "Income");
    XLSX.utils.book_append_sheet(wb, wsExpenditure, "Expenditure");
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales");
    XLSX.utils.book_append_sheet(wb, wsDebts, "Debts");

    XLSX.writeFile(wb, `Financial_Detailed_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Financial Detailed Report</h1>
        <p className="text-lg text-muted-foreground">Loading report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Financial Detailed Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Detailed Report</h1>
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
              <Label>Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Month</SelectLabel>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Year</SelectLabel>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="font-semibold">
              Net cashflow: <span className={netFlow >= 0 ? "text-emerald-700" : "text-rose-700"}>{money(currency.symbol, netFlow)}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message to members (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use this note for context (e.g., key wins, risks, and next steps). It will be included in exports.
          </p>
          <Textarea value={messageToMembers} onChange={(e) => setMessageToMembers(e.target.value)} className="min-h-[96px]" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cash on hand (current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-primary">{money(currency.symbol, cashOnHand)}</div>
            <p className="text-xs text-muted-foreground">Sum of all account balances.</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Income (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-700">{money(currency.symbol, incomeTotal)}</div>
            <p className="text-xs text-muted-foreground">All income transactions.</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Expenditure (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-700">{money(currency.symbol, expenditureTotal)}</div>
            <p className="text-xs text-muted-foreground">All expenditure transactions.</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Debts outstanding (current)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-700">{money(currency.symbol, debtsOutstandingTotal)}</div>
            <p className="text-xs text-muted-foreground">Outstanding + partially paid.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income breakdown (top sources)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeBySource.length ? (
                  incomeBySource.map((r) => (
                    <TableRow key={r.k}>
                      <TableCell className="font-medium">{r.k}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{money(currency.symbol, r.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      No income recorded for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure breakdown (top purposes)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenditureByPurpose.length ? (
                  expenditureByPurpose.map((r) => (
                    <TableRow key={r.k}>
                      <TableCell className="font-medium">{r.k}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-700">{money(currency.symbol, r.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      No expenditure recorded for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {income.length ? (
                income.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="font-medium">{r.source}</TableCell>
                    <TableCell className="text-muted-foreground">{accountNameById.get(r.account_id) || "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{money(currency.symbol, r.amount || 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No income recorded for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenditure transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditure.length ? (
                expenditure.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="font-medium">{r.purpose}</TableCell>
                    <TableCell className="text-muted-foreground">{accountNameById.get(r.account_id) || "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-700">{money(currency.symbol, r.amount || 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No expenditure recorded for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length ? (
                  sales.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.sale_date), "yyyy-MM-dd")}</TableCell>
                      <TableCell className="font-medium">{r.customer_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.payment_method}</TableCell>
                      <TableCell className="text-right font-semibold">{money(currency.symbol, r.total_amount || 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No sales recorded for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding debts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.length ? (
                  debts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.customer_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.due_date ? format(new Date(d.due_date), "yyyy-MM-dd") : "—"}
                      </TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">{money(currency.symbol, d.amount_due || 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No outstanding debts.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
                <TableCell className="text-right font-extrabold text-primary">{money(currency.symbol, cashOnHand)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
