"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, getMonth, getYear, parseISO } from "date-fns";
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
  Project // Generic Project interface for all active projects
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
  const [activeMembersCount, setActiveMembersCount] = useState(0); // Total active members in the system
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

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const allTransactions: Transaction[] = [];

    // Fetch Income Transactions
    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    if (incomeError) console.error("Error fetching income:", incomeError);
    incomeData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'income',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.source,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Expenditure Transactions
    const { data: expenditureData, error: expenditureError } = await supabase
      ..from('expenditure_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: ExpenditureTxRow[] | null, error: PostgrestError | null };

    if (expenditureError) console.error("Error fetching expenditure:", expenditureError);
    expenditureData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'expenditure',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.purpose,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Petty Cash Transactions
    const { data: pettyCashData, error: pettyCashError } = await supabase
      .from('petty_cash_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: PettyCashTxRow[] | null, error: PostgrestError | null };

    if (pettyCashError) console.error("Error fetching petty cash:", pettyCashError);
    pettyCashData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'petty_cash',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.purpose,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Project Pledges
    const { data: pledgesData, error: pledgesError } = await supabase
      .from('project_pledges')
      .select('id, due_date, amount, status, comments, projects(name)')
      .eq('member_id', currentUser.id)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString()) as { data: PledgeTxRow[] | null, error: PostgrestError | null };

    if (pledgesError) console.error("Error fetching pledges:", pledgesError);
    pledgesData?.forEach(pledge => allTransactions.push({
      id: pledge.id,
      type: 'pledge',
      date: parseISO(pledge.due_date), // Use due_date as the transaction date for pledges
      amount: pledge.amount,
      description: pledge.comments || pledge.projects?.name || 'Project Pledge',
      accountOrProjectName: pledge.projects?.name || 'Unknown Project',
      status: pledge.status,
      dueDate: parseISO(pledge.due_date),
    }));

    // Fetch ALL active projects (for system-wide expected contributions AND member-specific project breakdown)
    const { data: allProjectsData, error: allProjectsError } = await supabase
      .from('projects')
      .select('id, name, member_contribution_amount')
      .eq('status', 'Open'); // Only open projects

    if (allProjectsError) console.error("Error fetching all active projects:", allProjectsError);
    setAllActiveProjects(allProjectsData || []);

    // Fetch active members count (for system-wide expected contributions)
    const { count: membersCount, error: membersCountError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active');

    if (membersCountError) {
      console.error("Error fetching active members count:", membersCountError);
      setActiveMembersCount(0);
    } else {
      setActiveMembersCount(membersCount || 0);
    }

    const filteredAndSorted = allTransactions
      .filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.accountOrProjectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

    setMyTransactions(filteredAndSorted);
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    if (!authLoading) {
      fetchMyContributions();
    }
  }, [authLoading, fetchMyContributions]);

  // Calculations now only reflect pledges
  const totalPaidPledges = myTransactions.filter(t => t.type === 'pledge' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const totalPendingPledges = myTransactions.filter(t => t.type === 'pledge' && (t.status === 'Active' || t.status === 'Overdue')).reduce((sum, t) => sum + t.amount, 0);
  // Net balance is removed as requested, so no need for totalIncome/totalExpenditure

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
            totalPaidPledges={totalPaidPledges}
            totalPendingPledges={totalPendingPledges}
            allActiveProjects={allActiveProjects} // Pass ALL active projects
            activeMembersCount={activeMembersCount} // Pass active members count
            currentUserId={currentUser?.id || ''} // Pass current user ID for specific collections
            renderDay={renderDay}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="my-detailed-contributions" className="space-y-6 mt-6">
          <MyContributionsDetailedTab
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            months={months}
            years={years}
            myTransactions={myTransactions}
            currency={currency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyContributions;