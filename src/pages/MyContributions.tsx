"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, getMonth, getYear, parseISO, startOfYear, endOfYear } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useSystemSettings } from "@/context/SystemSettingsContext";

import MyContributionsHeader from "@/components/my-contributions/MyContributionsHeader";
import MyContributionsOverviewTab from "@/components/my-contributions/MyContributionsOverviewTab";
import MyContributionsDetailedTab from "@/components/my-contributions/MyContributionsDetailedTab";
import {
  Transaction,
  PledgeTxRow,
  MonthYearOption,
  IncomeTxRow,
  ExpenditureTxRow,
  PettyCashTxRow,
  Project, // Generic Project interface for all active projects
  FinancialAccountName
} from "@/components/my-contributions/types";

const MyContributions: React.FC = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { currency } = useSystemSettings();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [allActiveProjects, setAllActiveProjects] = useState<Project[]>([]); // ALL active projects in the system
  const [totalYearlyPledgedAmount, setTotalYearlyPledgedAmount] = useState(0);
  const [totalYearlyPaidAmount, setTotalYearlyPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months: MonthYearOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years: MonthYearOption[] = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchMyContributions = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Date range for fetching all transactions (now covers the entire filterYear)
    const startOfPeriod = startOfYear(new Date(parseInt(filterYear), 0, 1));
    const endOfPeriod = endOfYear(new Date(parseInt(filterYear), 0, 1));

    const allTransactions: Transaction[] = [];

    // Fetch Income Transactions for the selected year, filtered for project-related income
    const { data: incomeData, error: incomeError } = (await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name), pledge_id') // Select pledge_id
      .eq('profile_id', currentUser.id)
      .gte('date', startOfPeriod.toISOString())
      .lte('date', endOfPeriod.toISOString())
      .or('source.ilike.%Project Collection:%,pledge_id.not.is.null')) as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    if (incomeError) console.error("Error fetching income:", incomeError);
    incomeData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'income',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.source,
      accountOrProjectName: (tx.financial_accounts as FinancialAccountName)?.name || 'Unknown Account',
      pledgeId: tx.pledge_id || undefined, // Include pledgeId
    }));

    // Fetch Project Pledges for the selected year
    const { data: pledgesDataForYear, error: pledgesErrorForYear } = await supabase
      .from('project_pledges')
      .select('id, due_date, amount, status, comments, projects(name)')
      .eq('member_id', currentUser.id)
      .gte('due_date', startOfPeriod.toISOString())
      .lte('due_date', endOfPeriod.toISOString()) as { data: PledgeTxRow[] | null, error: PostgrestError | null };

    if (pledgesErrorForYear) console.error("Error fetching pledges for year:", pledgesErrorForYear);
    pledgesDataForYear?.forEach(pledge => allTransactions.push({
      id: pledge.id,
      type: 'pledge',
      date: parseISO(pledge.due_date),
      amount: pledge.amount,
      description: pledge.comments || pledge.projects?.name || 'Project Pledge',
      accountOrProjectName: pledge.projects?.name || 'Unknown Project',
      status: pledge.status,
      dueDate: parseISO(pledge.due_date),
    }));

    // --- Fetch ALL pledges for the CURRENT YEAR for the Pledge Summary ---
    const startOfCurrentYear = startOfYear(new Date(currentYear, 0, 1));
    const endOfCurrentYear = endOfYear(new Date(currentYear, 0, 1));

    const { data: yearlyPledgesData, error: yearlyPledgesError } = await supabase
      .from('project_pledges')
      .select('amount, status')
      .eq('member_id', currentUser.id)
      .gte('due_date', startOfCurrentYear.toISOString())
      .lte('due_date', endOfCurrentYear.toISOString()) as { data: { amount: number; status: "Active" | "Paid" | "Overdue" }[] | null, error: PostgrestError | null };

    if (yearlyPledgesError) {
      console.error("MyContributions: Error fetching yearly pledges:", yearlyPledgesError);
      setTotalYearlyPledgedAmount(0);
      setTotalYearlyPaidAmount(0);
    } else {
      const totalPledged = (yearlyPledgesData || []).reduce((sum, p) => sum + p.amount, 0);
      const totalPaid = (yearlyPledgesData || []).filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      setTotalYearlyPledgedAmount(totalPledged);
      setTotalYearlyPaidAmount(totalPaid);
    }
    // --- End New Pledge Summary Fetch ---

    // Fetch ALL active projects (for system-wide expected contributions AND member-specific project breakdown)
    const { data: allProjectsData, error: allProjectsError } = await supabase
      .from('projects')
      .select('id, name, member_contribution_amount')
      .eq('status', 'Open'); // Only open projects

    if (allProjectsError) console.error("Error fetching all active projects:", allProjectsError);
    setAllActiveProjects(allProjectsData || []);

    const filteredAndSorted = allTransactions
      .filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.accountOrProjectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

    setMyTransactions(filteredAndSorted);
    setLoading(false);
  }, [currentUser, filterYear, searchQuery, currentYear]); // filterMonth is no longer a direct dependency for the main fetch

  useEffect(() => {
    if (!authLoading) {
      fetchMyContributions();
    }
  }, [authLoading, fetchMyContributions]);

  const transactionsByDate = myTransactions.reduce((acc, transaction) => {
    const dateKey = format(transaction.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey];
    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayTransactions && dayTransactions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <span className="h-1 w-1 rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <MyContributionsHeader
        title="Contributions"
        description="Loading your contributions..."
      />
    );
  }

  if (error) {
    return (
      <MyContributionsHeader
        title="Contributions"
        description={`Error: ${error}`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <MyContributionsHeader
        title="My Contributions"
        description="View your personal financial activities and project pledges."
      />

      <Tabs defaultValue="my-contributions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-contributions">Overview</TabsTrigger>
          <TabsTrigger value="my-detailed-contributions">Detailed Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="my-contributions" className="space-y-6 mt-6">
          <MyContributionsOverviewTab
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            months={months}
            years={years}
            transactionsByDate={transactionsByDate}
            totalYearlyPledgedAmount={totalYearlyPledgedAmount}
            totalYearlyPaidAmount={totalYearlyPaidAmount}
            allActiveProjects={allActiveProjects} // Pass ALL active projects
            currentUserId={currentUser?.id || ''} // Pass current user ID for specific collections
            renderDay={renderDay}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="my-detailed-contributions" className="space-y-6 mt-6">
          <MyContributionsDetailedTab
            filterMonth={filterMonth} // Still passed for consistency, but not used for data fetching in this tab
            setFilterMonth={setFilterMonth}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            months={months}
            years={years}
            myTransactions={myTransactions} // This now contains yearly data
            currency={currency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyContributions;