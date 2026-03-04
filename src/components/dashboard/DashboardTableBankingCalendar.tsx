"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  Transaction,
  IncomeTxRow,
  ExpenditureTxRow,
  PledgeTxRow,
  JoinedFinancialAccount,
  FinancialAccount,
} from "@/types/common";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { perfStart } from "@/utils/perf";

type ActiveProject = {
  id: string;
  name: string;
};

const DashboardTableBankingCalendar: React.FC = () => {
  const { currency } = useSystemSettings();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // We display exactly two months: previous + current (current shown last).
  // `currentMonth` represents the month shown on the right.
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);

  const [dailyMatrixLoading, setDailyMatrixLoading] = useState(false);
  const [salesByAccount, setSalesByAccount] = useState<Record<string, number>>({});
  const [collectionsByAccountProject, setCollectionsByAccountProject] = useState<Record<string, Record<string, number>>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstDisplayedMonth = useMemo(() => startOfMonth(subMonths(currentMonth, 1)), [currentMonth]);

  const fetchAllData = useCallback(async () => {
    const endAll = perfStart("DashboardTableBankingCalendar:fetchAllData");
    setLoading(true);
    setError(null);
    if (!currentUser) {
      setLoading(false);
      endAll({ skipped: true, reason: "no-currentUser" });
      return;
    }

    try {
      // Fetch only what we display: previous month through end of current month.
      const startOfRange = startOfMonth(subMonths(currentMonth, 1));
      const endOfRange = endOfMonth(currentMonth);

      const allFetchedTransactions: Transaction[] = [];

      // Income
      let incomeQuery = supabase
        .from("income_transactions")
        .select("id, date, amount, source, financial_accounts(id, name), pledge_id")
        .gte("date", startOfRange.toISOString())
        .lte("date", endOfRange.toISOString());
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq("profile_id", currentUser.id);
      }
      const endIncome = perfStart("DashboardTableBankingCalendar:income_transactions");
      const { data: incomeData, error: incomeError } =
        (await incomeQuery) as unknown as { data: IncomeTxRow[] | null; error: any };
      endIncome({ rows: incomeData?.length ?? 0, errorCode: incomeError?.code });
      if (incomeError) console.error("Error fetching income:", incomeError);
      incomeData?.forEach((tx) =>
        allFetchedTransactions.push({
          id: tx.id,
          type: "income",
          date: parseISO(tx.date),
          amount: tx.amount,
          description: tx.source,
          accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || "Unknown Account",
          accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined,
          pledgeId: tx.pledge_id || undefined,
        })
      );

      // Expenditure
      let expenditureQuery = supabase
        .from("expenditure_transactions")
        .select("id, date, amount, purpose, financial_accounts(id, name)")
        .gte("date", startOfRange.toISOString())
        .lte("date", endOfRange.toISOString());
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq("profile_id", currentUser.id);
      }
      const endExp = perfStart("DashboardTableBankingCalendar:expenditure_transactions");
      const { data: expenditureData, error: expenditureError } =
        (await expenditureQuery) as unknown as { data: ExpenditureTxRow[] | null; error: any };
      endExp({ rows: expenditureData?.length ?? 0, errorCode: expenditureError?.code });
      if (expenditureError) console.error("Error fetching expenditure:", expenditureError);
      expenditureData?.forEach((tx) =>
        allFetchedTransactions.push({
          id: tx.id,
          type: "expenditure",
          date: parseISO(tx.date),
          amount: tx.amount,
          description: tx.purpose,
          accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || "Unknown Account",
          accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined,
        })
      );

      // Pledges
      let pledgesQuery = supabase
        .from("project_pledges")
        .select("id, due_date, amount, status, comments, projects(name)")
        .gte("due_date", startOfRange.toISOString())
        .lte("due_date", endOfRange.toISOString());
      if (!isAdmin) {
        pledgesQuery = pledgesQuery.eq("member_id", currentUser.id);
      }
      const endPledges = perfStart("DashboardTableBankingCalendar:project_pledges");
      const { data: pledgesData, error: pledgesError } =
        (await pledgesQuery) as unknown as { data: PledgeTxRow[] | null; error: any };
      endPledges({ rows: pledgesData?.length ?? 0, errorCode: pledgesError?.code });
      if (pledgesError) console.error("Error fetching pledges:", pledgesError);
      pledgesData?.forEach((pledge) =>
        allFetchedTransactions.push({
          id: pledge.id,
          type: "pledge",
          date: parseISO(pledge.due_date),
          amount: pledge.amount,
          description: pledge.comments || pledge.projects?.name || "Project Pledge",
          accountOrProjectName: pledge.projects?.name || "Unknown Project",
          status: pledge.status,
          dueDate: parseISO(pledge.due_date),
        })
      );

      setAllTransactions(allFetchedTransactions);

      // Financial Accounts
      let accountsQuery = supabase
        .from("financial_accounts")
        .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments");
      if (!isAdmin) {
        accountsQuery = accountsQuery.eq("profile_id", currentUser.id);
      }
      const endAccounts = perfStart("DashboardTableBankingCalendar:financial_accounts");
      const { data: accountsData, error: accountsError } = await accountsQuery;
      endAccounts({ rows: accountsData?.length ?? 0, errorCode: accountsError?.code });
      if (accountsError) console.error("Error fetching financial accounts:", accountsError);
      setFinancialAccounts(accountsData || []);

      // Active projects (for the daily matrix)
      const endProjects = perfStart("DashboardTableBankingCalendar:projects");
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "Open")
        .order("name", { ascending: true });
      endProjects({ rows: projectsData?.length ?? 0, errorCode: projectsError?.code });
      if (projectsError) console.error("Error fetching projects:", projectsError);
      setActiveProjects((projectsData || []) as ActiveProject[]);

      endAll({ ok: true, txs: allFetchedTransactions.length, accounts: accountsData?.length ?? 0 });
    } catch (err) {
      console.error("Unexpected error in fetchAllData:", err);
      setError("An unexpected error occurred while loading financial data.");
      showError("Failed to load financial data for the calendar.");
      endAll({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, currentMonth]);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // Fetch sales + project collections for the selected day to build the matrix.
  useEffect(() => {
    const fetchDailyMatrix = async () => {
      if (!selectedDate) {
        setSalesByAccount({});
        setCollectionsByAccountProject({});
        return;
      }

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      setDailyMatrixLoading(true);

      // SALES
      let salesQuery = supabase
        .from("sales_transactions")
        .select("id, sale_date, total_amount, received_into_account_id, profile_id")
        .gte("sale_date", start.toISOString())
        .lte("sale_date", end.toISOString());
      if (!isAdmin && currentUser?.id) {
        salesQuery = salesQuery.eq("profile_id", currentUser.id);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) {
        console.error("Error fetching sales transactions:", salesError);
        setSalesByAccount({});
      }

      const saleIds = (salesData || []).map((s: any) => s.id).filter(Boolean);

      const paymentsBySale = new Map<string, Array<{ account_id: string; amount: number }>>();

      if (saleIds.length > 0) {
        const { data: salePaymentsData, error: salePaymentsError } = await supabase
          .from("sale_payments")
          .select("sale_id, account_id, amount")
          .in("sale_id", saleIds);

        if (salePaymentsError) {
          console.error("Error fetching sale payments:", salePaymentsError);
        } else {
          (salePaymentsData || []).forEach((p: any) => {
            const list = paymentsBySale.get(p.sale_id) || [];
            list.push({ account_id: p.account_id, amount: Number(p.amount || 0) });
            paymentsBySale.set(p.sale_id, list);
          });
        }
      }

      const computedSalesByAccount: Record<string, number> = {};
      (salesData || []).forEach((s: any) => {
        const total = Number(s.total_amount || 0);

        const split = paymentsBySale.get(s.id);
        if (split && split.length > 0) {
          split.forEach((p) => {
            computedSalesByAccount[p.account_id] = (computedSalesByAccount[p.account_id] || 0) + Number(p.amount || 0);
          });
          return;
        }

        if (s.received_into_account_id) {
          const accId = String(s.received_into_account_id);
          computedSalesByAccount[accId] = (computedSalesByAccount[accId] || 0) + total;
        }
      });
      setSalesByAccount(computedSalesByAccount);

      // PROJECT COLLECTIONS
      const { data: collectionsData, error: collectionsError } = await supabase
        .from("project_collections")
        .select("project_id, receiving_account_id, amount, date")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());

      if (collectionsError) {
        console.error("Error fetching project collections:", collectionsError);
        setCollectionsByAccountProject({});
      } else {
        const computed: Record<string, Record<string, number>> = {};
        (collectionsData || []).forEach((c: any) => {
          const accId = c.receiving_account_id ? String(c.receiving_account_id) : null;
          const projectId = c.project_id ? String(c.project_id) : null;
          if (!accId || !projectId) return;
          if (!computed[accId]) computed[accId] = {};
          computed[accId][projectId] = (computed[accId][projectId] || 0) + Number(c.amount || 0);
        });
        setCollectionsByAccountProject(computed);
      }

      setDailyMatrixLoading(false);
    };

    fetchDailyMatrix();
  }, [selectedDate, currentUser?.id, isAdmin]);

  const transactionsByDate = useMemo(() => {
    return allTransactions.reduce((acc, transaction) => {
      const dateKey = format(transaction.date, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [allTransactions]);

  const modifiers = useMemo(() => {
    const incomeDates = new Set<string>();
    const expenditureDates = new Set<string>();
    const pledgeDates = new Set<string>();

    allTransactions.forEach((tx) => {
      const dateKey = format(tx.date, "yyyy-MM-dd");
      if (tx.type === "income") incomeDates.add(dateKey);
      if (tx.type === "expenditure") expenditureDates.add(dateKey);
      if (tx.type === "pledge") pledgeDates.add(dateKey);
    });

    return {
      income: Array.from(incomeDates).map((d) => parseISO(d)),
      expenditure: Array.from(expenditureDates).map((d) => parseISO(d)),
      pledge: Array.from(pledgeDates).map((d) => parseISO(d)),
    };
  }, [allTransactions]);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey];

    const hasIncome = dayTransactions?.some((t) => t.type === "income");
    const hasExpenditure = dayTransactions?.some((t) => t.type === "expenditure");
    const hasPledge = dayTransactions?.some((t) => t.type === "pledge");

    return (
      <div className="relative text-center w-full h-full flex flex-col items-center justify-center">
        {day.getDate()}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5">
          {hasIncome && <span className="h-1 w-1 rounded-full bg-green-500" title="Income" />}
          {hasExpenditure && <span className="h-1 w-1 rounded-full bg-red-500" title="Expenditure" />}
          {hasPledge && <span className="h-1 w-1 rounded-full bg-blue-500" title="Pledge" />}
        </div>
      </div>
    );
  };

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return transactionsByDate[dateKey] || [];
  }, [selectedDate, transactionsByDate]);

  const summaryByAccount = useMemo(() => {
    const incomeSummary: Record<string, number> = {};
    const expenditureSummary: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenditure = 0;

    selectedDayTransactions.forEach((tx) => {
      const account = financialAccounts.find((acc) => acc.id === tx.accountId);
      if (!account) return;

      if (tx.type === "income") {
        incomeSummary[account.id] = (incomeSummary[account.id] || 0) + tx.amount;
        totalIncome += tx.amount;
      } else if (tx.type === "expenditure") {
        expenditureSummary[account.id] = (expenditureSummary[account.id] || 0) + tx.amount;
        totalExpenditure += tx.amount;
      }
    });

    return { incomeSummary, expenditureSummary, totalIncome, totalExpenditure };
  }, [selectedDayTransactions, financialAccounts]);

  const pledgesSummary = useMemo(() => {
    const pledges = selectedDayTransactions.filter((tx) => tx.type === "pledge");
    const total = pledges.reduce((sum, p) => sum + p.amount, 0);
    const paid = pledges
      .filter((p) => (p.status || "").toLowerCase() === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const unpaid = total - paid;

    return {
      pledges,
      total,
      paid,
      unpaid,
    };
  }, [selectedDayTransactions]);

  const activeReceivingAccounts = useMemo(() => {
    return financialAccounts
      .filter((a) => a.can_receive_payments)
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  }, [financialAccounts]);

  const matrixTotals = useMemo(() => {
    const salesTotal = activeReceivingAccounts.reduce((sum, a) => sum + (salesByAccount[a.id] || 0), 0);

    const projectTotals: Record<string, number> = {};
    activeProjects.forEach((p) => {
      projectTotals[p.id] = activeReceivingAccounts.reduce(
        (sum, a) => sum + (collectionsByAccountProject[a.id]?.[p.id] || 0),
        0,
      );
    });

    const rowTotals: Record<string, number> = {};
    activeReceivingAccounts.forEach((a) => {
      const projectSum = activeProjects.reduce((sum, p) => sum + (collectionsByAccountProject[a.id]?.[p.id] || 0), 0);
      rowTotals[a.id] = (salesByAccount[a.id] || 0) + projectSum;
    });

    const grandTotal = Object.values(rowTotals).reduce((s, v) => s + v, 0);

    return { salesTotal, projectTotals, rowTotals, grandTotal };
  }, [activeReceivingAccounts, activeProjects, salesByAccount, collectionsByAccountProject]);

  if (loading) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
        <CardHeader>
          <CardTitle>Table Banking Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading calendar data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
        <CardHeader>
          <CardTitle>Table Banking Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading calendar: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
      <CardHeader>
        <CardTitle>Table Banking Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              // Show previous + current month (current on the right)
              month={firstDisplayedMonth}
              onMonthChange={(newFirstMonth) => {
                // DayPicker reports the FIRST displayed month.
                // Keep `currentMonth` as the month displayed last.
                setCurrentMonth(startOfMonth(addMonths(newFirstMonth, 1)));
              }}
              numberOfMonths={2}
              className="rounded-md border shadow w-full"
              components={{
                DayContent: ({ date }) => renderDay(date),
              }}
              modifiers={modifiers}
              modifiersClassNames={{
                income: "bg-green-100 dark:bg-green-900/50",
                expenditure: "bg-red-100 dark:bg-red-900/50",
                pledge: "bg-blue-100 dark:bg-blue-900/50",
              }}
            />
          </div>

          <div className="flex-1 space-y-4">
            <h3 className="text-lg font-semibold">
              Summary for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}
            </h3>

            {selectedDate ? (
              <>
                {financialAccounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenditure</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>{account.name}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {currency.symbol}
                            {(summaryByAccount.incomeSummary[account.id] || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {currency.symbol}
                            {(summaryByAccount.expenditureSummary[account.id] || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                        <TableCell>Grand Total</TableCell>
                        <TableCell className="text-right text-green-600">
                          {currency.symbol}
                          {summaryByAccount.totalIncome.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {currency.symbol}
                          {summaryByAccount.totalExpenditure.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No financial accounts found.</p>
                )}

                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm text-muted-foreground">Pledges due on selected date</p>
                      <p className="text-base font-semibold">
                        {pledgesSummary.pledges.length} pledge{pledgesSummary.pledges.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">
                        Total: {currency.symbol}
                        {pledgesSummary.total.toFixed(2)}
                      </Badge>
                      <Badge className="bg-green-600 hover:bg-green-600/90 text-white">
                        Paid: {currency.symbol}
                        {pledgesSummary.paid.toFixed(2)}
                      </Badge>
                      <Badge className="bg-blue-600 hover:bg-blue-600/90 text-white">
                        Unpaid: {currency.symbol}
                        {pledgesSummary.unpaid.toFixed(2)}
                      </Badge>
                    </div>
                  </div>

                  {pledgesSummary.pledges.length > 0 ? (
                    <div className="space-y-2">
                      {pledgesSummary.pledges.map((p) => (
                        <div key={p.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.accountOrProjectName}</p>
                            {p.description ? (
                              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={(p.status || "").toLowerCase() === "paid" ? "default" : "secondary"}>
                              {(p.status || "Unpaid").toString()}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {currency.symbol}
                              {p.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No pledges due on this date.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Select a date on the calendar to view its financial summary.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold">
              Daily collections by account ({selectedDate ? format(selectedDate, "PPP") : "Select a date"})
            </h3>
            {dailyMatrixLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Account</TableHead>
                    <TableHead className="text-right min-w-[120px]">Sales</TableHead>
                    {activeProjects.map((p) => (
                      <TableHead key={p.id} className="text-right min-w-[140px]">
                        {p.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[120px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReceivingAccounts.map((acc) => {
                    const rowSales = salesByAccount[acc.id] || 0;
                    const rowTotal = matrixTotals.rowTotals[acc.id] || 0;

                    return (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium whitespace-nowrap">{acc.name}</TableCell>
                        <TableCell className="text-right">
                          {currency.symbol}
                          {rowSales.toFixed(2)}
                        </TableCell>
                        {activeProjects.map((p) => {
                          const v = collectionsByAccountProject[acc.id]?.[p.id] || 0;
                          return (
                            <TableCell key={p.id} className="text-right">
                              {currency.symbol}
                              {v.toFixed(2)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-semibold">
                          {currency.symbol}
                          {rowTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                    <TableCell>Totals</TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}
                      {matrixTotals.salesTotal.toFixed(2)}
                    </TableCell>
                    {activeProjects.map((p) => (
                      <TableCell key={p.id} className="text-right">
                        {currency.symbol}
                        {(matrixTotals.projectTotals[p.id] || 0).toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {currency.symbol}
                      {matrixTotals.grandTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {activeReceivingAccounts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No active financial accounts found.</div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardTableBankingCalendar;