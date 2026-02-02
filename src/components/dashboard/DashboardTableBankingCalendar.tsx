"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, getMonth, getYear, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  Transaction,
  IncomeTxRow,
  ExpenditureTxRow,
  // Removed PettyCashTxRow
  PledgeTxRow,
  JoinedFinancialAccount, // Use JoinedFinancialAccount for the nested object
  FinancialAccount // Use FinancialAccount for the main type
} from "@/types/common"; // Updated import path
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Handshake, Loader2 } from "lucide-react";
import { perfStart } from "@/utils/perf";


const DashboardTableBankingCalendar: React.FC = () => {
  const { currency } = useSystemSettings();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date()); // Controls which month is displayed in the calendar
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Determine the date range for fetching (e.g., 3 months before and 3 months after the current month view)
      const startOfRange = startOfMonth(subMonths(month, 1)); // Start from 1 month before current view
      const endOfRange = endOfMonth(addMonths(month, 1));   // End 1 month after current view

      const allFetchedTransactions: Transaction[] = []; // Declared here

      // Fetch Income Transactions
      let incomeQuery = supabase
        .from('income_transactions')
        .select('id, date, amount, source, financial_accounts(id, name), pledge_id')
        .gte('date', startOfRange.toISOString())
        .lte('date', endOfRange.toISOString());
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      const endIncome = perfStart("DashboardTableBankingCalendar:income_transactions");
      const { data: incomeData, error: incomeError } = await incomeQuery as { data: IncomeTxRow[] | null, error: any };
      endIncome({ rows: incomeData?.length ?? 0, errorCode: incomeError?.code });
      if (incomeError) console.error("Error fetching income:", incomeError);
      incomeData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'income',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.source,
        accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || 'Unknown Account',
        accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined, // Added accountId
        pledgeId: tx.pledge_id || undefined,
      }));

      // Fetch Expenditure Transactions (now includes former petty cash)
      let expenditureQuery = supabase
        .from('expenditure_transactions')
        .select('id, date, amount, purpose, financial_accounts(id, name)')
        .gte('date', startOfRange.toISOString())
        .lte('date', endOfRange.toISOString());
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      const endExp = perfStart("DashboardTableBankingCalendar:expenditure_transactions");
      const { data: expenditureData, error: expenditureError } = await expenditureQuery as { data: ExpenditureTxRow[] | null, error: any };
      endExp({ rows: expenditureData?.length ?? 0, errorCode: expenditureError?.code });
      if (expenditureError) console.error("Error fetching expenditure:", expenditureError);
      expenditureData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'expenditure',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.purpose,
        accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || 'Unknown Account',
        accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined, // Added accountId
      }));

      // Removed Petty Cash Transactions fetch

      // Fetch Project Pledges (both active/unpaid and paid)
      let pledgesQuery = supabase
        .from('project_pledges')
        .select('id, due_date, amount, status, comments, projects(name)')
        .gte('due_date', startOfRange.toISOString())
        .lte('due_date', endOfRange.toISOString());
      if (!isAdmin) {
        pledgesQuery = pledgesQuery.eq('member_id', currentUser.id);
      }
      const endPledges = perfStart("DashboardTableBankingCalendar:project_pledges");
      const { data: pledgesData, error: pledgesError } = await pledgesQuery as { data: PledgeTxRow[] | null, error: any };
      endPledges({ rows: pledgesData?.length ?? 0, errorCode: pledgesError?.code });
      if (pledgesError) console.error("Error fetching pledges:", pledgesError);
      pledgesData?.forEach(pledge => allFetchedTransactions.push({
        id: pledge.id,
        type: 'pledge',
        date: parseISO(pledge.due_date),
        amount: pledge.amount,
        description: pledge.comments || pledge.projects?.name || 'Project Pledge',
        accountOrProjectName: pledge.projects?.name || 'Unknown Project',
        status: pledge.status,
        dueDate: parseISO(pledge.due_date),
      }));

      setAllTransactions(allFetchedTransactions);

      // Fetch Financial Accounts
      let accountsQuery = supabase
        .from('financial_accounts')
        .select('id, name, current_balance, initial_balance, profile_id, can_receive_payments'); // Select all fields for FinancialAccount type
      if (!isAdmin) {
        accountsQuery = accountsQuery.eq('profile_id', currentUser.id);
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
  }, [currentUser, isAdmin, month]);

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
    const incomeDates = new Set<Date>();
    const expenditureDates = new Set<Date>();
    const pledgeDates = new Set<Date>();

    allTransactions.forEach(tx => {
      if (tx.date) {
        if (tx.type === 'income') incomeDates.add(tx.date);
        if (tx.type === 'expenditure') expenditureDates.add(tx.date); // Now includes former petty cash
        if (tx.type === 'pledge') pledgeDates.add(tx.date);
      }
    });

    return {
      income: Array.from(incomeDates),
      expenditure: Array.from(expenditureDates),
      pledge: Array.from(pledgeDates),
    };
  }, [allTransactions]);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey];

    const hasIncome = dayTransactions?.some(t => t.type === 'income');
    const hasExpenditure = dayTransactions?.some(t => t.type === 'expenditure'); // Now includes former petty cash
    const hasPledge = dayTransactions?.some(t => t.type === 'pledge');

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

    selectedDayTransactions.forEach(tx => {
      // For the summary bar, we only care about direct income/expenditure to financial accounts.
      // Pledges are commitments, not direct cash flow on a given day for the account summary.
      const account = financialAccounts.find(acc => acc.id === tx.accountId); // Corrected lookup to use accountId
      if (account) { // Only include transactions linked to a known financial account
        if (tx.type === 'income') {
          incomeSummary[account.id] = (incomeSummary[account.id] || 0) + tx.amount;
          totalIncome += tx.amount;
        } else if (tx.type === 'expenditure') { // Now includes former petty cash
          expenditureSummary[account.id] = (expenditureSummary[account.id] || 0) + tx.amount;
          totalExpenditure += tx.amount;
        }
      }
    });

    return { incomeSummary, expenditureSummary, totalIncome, totalExpenditure };
  }, [selectedDayTransactions, financialAccounts]);

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
            month={month}
            onMonthChange={setMonth}
            numberOfMonths={3}
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
          <h3 className="text-lg font-semibold">Summary for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</h3>
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
                    {financialAccounts.map(account => (
                      <TableRow key={account.id}>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {currency.symbol}{(summaryByAccount.incomeSummary[account.id] || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {currency.symbol}{(summaryByAccount.expenditureSummary[account.id] || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell>Grand Total</TableCell>
                      <TableCell className="text-right text-green-600">
                        {currency.symbol}{summaryByAccount.totalIncome.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {currency.symbol}{summaryByAccount.totalExpenditure.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No financial accounts found.</p>
              )}
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