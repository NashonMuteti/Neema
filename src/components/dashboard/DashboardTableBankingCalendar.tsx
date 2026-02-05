"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
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
      <CardContent className="flex flex-col lg:flex-row gap-6">
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
      </CardContent>
    </Card>
  );
};

export default DashboardTableBankingCalendar;