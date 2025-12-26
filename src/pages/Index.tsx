"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import SoonDueProjectsGraph from "@/components/dashboard/SoonDueProjectsGraph";
import ContributionsProgressGraph from "@/components/dashboard/ContributionsProgressGraph";
import IncomeExpenditureGraph from "@/components/dashboard/IncomeExpenditureGraph";
import FinancialSummaryBar from "@/components/dashboard/FinancialSummaryBar"; // New import
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getYear, format, parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import { useBranding } from "@/context/BrandingContext"; // New import

// Define a simplified Project interface for the dashboard's dummy data
interface DashboardProject {
  id: string;
  name: string;
  dueDate?: Date;
  status: "Open" | "Closed" | "Deleted";
}

// Define interface for monthly financial data, now including year and outstanding pledges
interface MonthlyFinancialData {
  year: number;
  month: string;
  income: number; // Now includes original income, project collections, and paid pledges
  expenditure: number;
  outstandingPledges: number; // New field
}

// Define interface for project contribution data
interface ProjectContributionData {
  name: string;
  expected: number;
  actual: number;
}

// Define interface for financial account summary
interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

const Index = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { headerTitle } = useBranding(); // Use headerTitle from branding context
  const [monthlyFinancialData, setMonthlyFinancialData] = useState<MonthlyFinancialData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [financialsError, setFinancialsError] = useState<string | null>(null);

  const [dashboardProjects, setDashboardProjects] = useState<DashboardProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [contributionsProgressData, setContributionsProgressData] = useState<ProjectContributionData[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [contributionsError, setContributionsError] = useState<string | null>(null);

  // New states for FinancialSummaryBar
  const [totalUnpaidPledges, setTotalUnpaidPledges] = useState(0);
  const [activeFinancialAccounts, setActiveFinancialAccounts] = useState<FinancialAccountSummary[]>([]);
  const [grandTotalAccountsBalance, setGrandTotalAccountsBalance] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // New state for Cumulative Net Operating Balance
  const [cumulativeNetOperatingBalance, setCumulativeNetOperatingBalance] = useState(0);
  const [loadingCumulativeNet, setLoadingCumulativeNet] = useState(true);
  const [cumulativeNetError, setCumulativeNetError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const fetchFinancialData = useCallback(async () => {
    setLoadingFinancials(true);
    setFinancialsError(null);

    if (!currentUser) {
      setLoadingFinancials(false);
      return;
    }

    try {
      // Fetch income transactions
      let incomeQuery = supabase.from('income_transactions').select('date, amount');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      const { data: incomeTransactions, error: incomeError } = await incomeQuery;

      // Fetch expenditure transactions
      let expenditureQuery = supabase.from('expenditure_transactions').select('date, amount');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;

      // Fetch project collections (contributions to projects)
      let projectCollectionsQuery = supabase.from('project_collections').select('date, amount');
      if (!isAdmin) {
        projectCollectionsQuery = projectCollectionsQuery.eq('member_id', currentUser.id);
      }
      const { data: projectCollections, error: collectionsError } = await projectCollectionsQuery;

      // Fetch project pledges
      let projectPledgesQuery = supabase.from('project_pledges').select('due_date, amount, status');
      if (!isAdmin) {
        projectPledgesQuery = projectPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: projectPledges, error: pledgesError } = await projectPledgesQuery;

      if (incomeError || expenditureError || collectionsError || pledgesError) {
        console.error("Error fetching financial data:", incomeError || expenditureError || collectionsError || pledgesError);
        setFinancialsError("Failed to load financial data.");
        setMonthlyFinancialData([]);
        setAvailableYears([]);
        return;
      }

      const aggregatedData: Record<string, { income: number; expenditure: number; outstandingPledges: number }> = {};
      const yearsSet = new Set<number>();

      // Helper to aggregate data
      const aggregateByMonth = (dateStr: string, type: 'income' | 'expenditure' | 'outstandingPledges', amount: number) => {
        const date = parseISO(dateStr);
        const year = getYear(date);
        const month = format(date, 'MMM');
        const key = `${year}-${month}`;
        
        if (!aggregatedData[key]) {
          aggregatedData[key] = { income: 0, expenditure: 0, outstandingPledges: 0 };
        }
        aggregatedData[key][type] += amount;
        yearsSet.add(year);
      };

      // Process income transactions
      incomeTransactions?.forEach(tx => aggregateByMonth(tx.date, 'income', tx.amount));

      // Process expenditure transactions
      expenditureTransactions?.forEach(tx => aggregateByMonth(tx.date, 'expenditure', tx.amount));

      // Process project collections (add to income)
      projectCollections?.forEach(collection => aggregateByMonth(collection.date, 'income', collection.amount));

      // Process project pledges
      projectPledges?.forEach(pledge => {
        if (pledge.status === 'Paid') {
          aggregateByMonth(pledge.due_date, 'income', pledge.amount); // Paid pledges count as income
        } else if (pledge.status === 'Active') { // 'Overdue' is now 'Active' in DB
          aggregateByMonth(pledge.due_date, 'outstandingPledges', pledge.amount);
        }
      });

      // Convert to array and sort
      const sortedData: MonthlyFinancialData[] = Object.keys(aggregatedData)
        .map(key => {
          const [yearStr, monthStr] = key.split('-');
          return {
            year: parseInt(yearStr),
            month: monthStr,
            income: aggregatedData[key].income,
            expenditure: aggregatedData[key].expenditure,
            outstandingPledges: aggregatedData[key].outstandingPledges,
          };
        })
        .sort((a, b) => {
          // Sort by year, then by month (Jan=0, Feb=1, etc.)
          if (a.year !== b.year) return a.year - b.year;
          const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
        });

      setMonthlyFinancialData(sortedData);
      
      // Generate available years for the filter (current year and 9 preceding years)
      const currentYear = getYear(new Date());
      const yearsArray = Array.from({ length: 10 }, (_, i) => currentYear - i).sort((a, b) => b - a);
      setAvailableYears(yearsArray);

    } catch (err) {
      console.error("Unexpected error in fetchFinancialData:", err);
      setFinancialsError("An unexpected error occurred while loading financial data.");
    } finally {
      setLoadingFinancials(false);
    }
  }, [currentUser, isAdmin]);

  const fetchDashboardProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsError(null);

    if (!currentUser) {
      setLoadingProjects(false);
      return;
    }

    try {
      let query = supabase
        .from('projects')
        .select('id, name, due_date, status')
        .neq('status', 'Deleted'); // Exclude deleted projects
      
      if (!isAdmin) {
        query = query.eq('profile_id', currentUser.id); // Use profile_id for non-admins
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching dashboard projects:", error);
        setProjectsError("Failed to load projects for dashboard.");
        setDashboardProjects([]);
        return;
      }

      setDashboardProjects(data.map(p => ({
        id: p.id,
        name: p.name,
        dueDate: p.due_date ? parseISO(p.due_date) : undefined,
        status: p.status as "Open" | "Closed" | "Deleted",
      })));
    } catch (err) {
      console.error("Unexpected error in fetchDashboardProjects:", err);
      setProjectsError("An unexpected error occurred while loading projects.");
    } finally {
      setLoadingProjects(false);
    }
  }, [currentUser, isAdmin]);

  const fetchContributionsProgress = useCallback(async () => {
    setLoadingContributions(true);
    setContributionsError(null);

    if (!currentUser) {
      setLoadingContributions(false);
      return;
    }

    try {
      // First, fetch the count of active members
      let activeMembersCount = 0;
      const { count: membersCount, error: membersCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');

      if (membersCountError) {
        console.error("Error fetching active members count:", membersCountError);
        // Proceed with 0 active members if there's an error
      } else {
        activeMembersCount = membersCount || 0;
      }

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, member_contribution_amount')
        .eq('status', 'Open'); // Only consider open projects for contributions progress
      
      if (!isAdmin) {
        projectsQuery = projectsQuery.eq('profile_id', currentUser.id); // Use profile_id for non-admins
      }

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) {
        console.error("Error fetching projects for contributions progress:", projectsError);
        setContributionsError("Failed to load projects for contributions progress.");
        setContributionsProgressData([]);
        return;
      }

      const projectContributions: ProjectContributionData[] = [];
      for (const project of projectsData || []) {
        // Corrected: Multiply member_contribution_amount by activeMembersCount for total expected
        const expected = (project.member_contribution_amount || 0) * activeMembersCount; 

        let collectionsQuery = supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id);
        // RLS on project_collections will handle member_id filtering if not admin

        const { data: collectionsData, error: collectionsError } = await collectionsQuery;

        if (collectionsError) {
          console.error(`Error fetching collections for project ${project.name}:`, collectionsError);
          // Continue with 0 actual if error
        }

        const actualCollections = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        // Fetch pledges for the project
        let pledgesQuery = supabase
          .from('project_pledges')
          .select('amount')
          .eq('project_id', project.id)
          .eq('status', 'Paid'); // Only count paid pledges as actual contributions
        // RLS on project_pledges will handle member_id filtering if not admin

        const { data: pledgesData, error: pledgesError } = await pledgesQuery;

        if (pledgesError) {
          console.error(`Error fetching pledges for project ${project.name}:`, pledgesError);
        }

        const actualPledges = (pledgesData || []).reduce((sum, p) => sum + p.amount, 0);

        projectContributions.push({
          name: project.name,
          expected: expected,
          actual: actualCollections + actualPledges, // Sum collections and paid pledges for actual
        });
      }
      setContributionsProgressData(projectContributions);
    } catch (err) {
      console.error("Unexpected error in fetchContributionsProgress:", err);
      setContributionsError("An unexpected error occurred while loading contributions progress.");
    } finally {
      setLoadingContributions(false);
    }
  }, [currentUser, isAdmin]);

  const fetchFinancialSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);

    if (!currentUser) {
      setLoadingSummary(false);
      return;
    }

    try {
      // Fetch total unpaid pledges
      let unpaidPledgesQuery = supabase
        .from('project_pledges')
        .select('amount')
        .eq('status', 'Active'); // 'Active' now includes 'Overdue'

      if (!isAdmin) {
        unpaidPledgesQuery = unpaidPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: unpaidPledgesData, error: unpaidPledgesError } = await unpaidPledgesQuery;

      if (unpaidPledgesError) {
        console.error("Error fetching unpaid pledges:", unpaidPledgesError);
        setSummaryError("Failed to load unpaid pledges.");
        setTotalUnpaidPledges(0);
      } else {
        const total = (unpaidPledgesData || []).reduce((sum, pledge) => sum + pledge.amount, 0);
        setTotalUnpaidPledges(total);
      }

      // Fetch active financial accounts
      let accountsQuery = supabase
        .from('financial_accounts')
        .select('id, name, current_balance');
      
      if (!isAdmin) {
        accountsQuery = accountsQuery.eq('profile_id', currentUser.id);
      }
      const { data: accountsData, error: accountsError } = await accountsQuery;

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        setSummaryError("Failed to load financial accounts.");
        setActiveFinancialAccounts([]);
        setGrandTotalAccountsBalance(0);
      } else {
        setActiveFinancialAccounts(accountsData || []);
        const grandTotal = (accountsData || []).reduce((sum, account) => sum + account.current_balance, 0);
        setGrandTotalAccountsBalance(grandTotal);
      }

    } catch (err) {
      console.error("Unexpected error in fetchFinancialSummary:", err);
      setSummaryError("An unexpected error occurred while loading financial summary.");
    } finally {
      setLoadingSummary(false);
    }
  }, [currentUser, isAdmin]);

  const fetchCumulativeNetOperatingBalance = useCallback(async () => {
    setLoadingCumulativeNet(true);
    setCumulativeNetError(null);

    if (!currentUser) {
      setLoadingCumulativeNet(false);
      return;
    }

    try {
      let totalIncomeAllTime = 0;
      let totalExpenditureAllTime = 0;

      // Fetch all income transactions
      let incomeQuery = supabase.from('income_transactions').select('amount');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      const { data: incomeTransactions, error: incomeError } = await incomeQuery;
      if (incomeError) throw incomeError;
      totalIncomeAllTime += (incomeTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      // Fetch all project collections
      let projectCollectionsQuery = supabase.from('project_collections').select('amount');
      if (!isAdmin) {
        projectCollectionsQuery = projectCollectionsQuery.eq('member_id', currentUser.id);
      }
      const { data: projectCollections, error: collectionsError } = await projectCollectionsQuery;
      if (collectionsError) throw collectionsError;
      totalIncomeAllTime += (projectCollections || []).reduce((sum, c) => sum + c.amount, 0);

      // Fetch all paid project pledges
      let paidPledgesQuery = supabase.from('project_pledges').select('amount').eq('status', 'Paid');
      if (!isAdmin) {
        paidPledgesQuery = paidPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: paidPledges, error: paidPledgesError } = await paidPledgesQuery;
      if (paidPledgesError) throw paidPledgesError;
      totalIncomeAllTime += (paidPledges || []).reduce((sum, p) => sum + p.amount, 0);

      // Fetch all expenditure transactions
      let expenditureQuery = supabase.from('expenditure_transactions').select('amount');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;
      if (expenditureError) throw expenditureError;
      totalExpenditureAllTime += (expenditureTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      // Fetch all petty cash transactions
      let pettyCashQuery = supabase.from('petty_cash_transactions').select('amount');
      if (!isAdmin) {
        pettyCashQuery = pettyCashQuery.eq('profile_id', currentUser.id);
      }
      const { data: pettyCashTransactions, error: pettyCashError } = await pettyCashQuery;
      if (pettyCashError) throw pettyCashError;
      totalExpenditureAllTime += (pettyCashTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      setCumulativeNetOperatingBalance(totalIncomeAllTime - totalExpenditureAllTime);

    } catch (err) {
      console.error("Unexpected error in fetchCumulativeNetOperatingBalance:", err);
      setCumulativeNetError("An unexpected error occurred while loading cumulative net balance.");
    } finally {
      setLoadingCumulativeNet(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser && !authLoading) {
      fetchFinancialData();
      fetchDashboardProjects();
      fetchContributionsProgress();
      fetchFinancialSummary(); // Fetch new summary data
      fetchCumulativeNetOperatingBalance(); // Fetch the new cumulative net operating balance
    }
  }, [currentUser, authLoading, fetchFinancialData, fetchDashboardProjects, fetchContributionsProgress, fetchFinancialSummary, fetchCumulativeNetOperatingBalance]);

  if (authLoading || loadingFinancials || loadingProjects || loadingContributions || loadingSummary || loadingCumulativeNet) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (financialsError || projectsError || contributionsError || summaryError || cumulativeNetError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-destructive">Error loading dashboard: {financialsError || projectsError || contributionsError || summaryError || cumulativeNetError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to {headerTitle} Financial Hub.
      </p>

      {/* New Financial Summary Bar */}
      <FinancialSummaryBar
        totalUnpaidPledges={totalUnpaidPledges}
        activeFinancialAccounts={activeFinancialAccounts}
        grandTotalAccountsBalance={grandTotalAccountsBalance}
        cumulativeNetOperatingBalance={cumulativeNetOperatingBalance} // Pass new prop
      />

      {/* Main Financial Overview */}
      <IncomeExpenditureGraph allFinancialData={monthlyFinancialData} availableYears={availableYears} />
      
      {/* Project-specific Graphs (side-by-side on larger screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SoonDueProjectsGraph projects={dashboardProjects} />
        <ContributionsProgressGraph projectsData={contributionsProgressData} />
      </div>
    </div>
  );
};

export default Index;