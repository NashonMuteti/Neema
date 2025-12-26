"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import SoonDueProjectsGraph from "@/components/dashboard/SoonDueProjectsGraph";
import ContributionsProgressGraph from "@/components/dashboard/ContributionsProgressGraph";
import IncomeExpenditureGraph from "@/components/dashboard/IncomeExpenditureGraph";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getYear, format, parseISO } from "date-fns";
import { showError } from "@/utils/toast";

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

const Index = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
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
        } else if (pledge.status === 'Active' || pledge.status === 'Overdue') {
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
        const expected = project.member_contribution_amount || 0; // Assuming this is the expected per member, or total
        // For simplicity, let's assume member_contribution_amount is the *total* expected for the project
        // If it's per member, we'd need to fetch member count for the project.

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

  useEffect(() => {
    if (currentUser && !authLoading) {
      fetchFinancialData();
      fetchDashboardProjects();
      fetchContributionsProgress();
    }
  }, [currentUser, authLoading, fetchFinancialData, fetchDashboardProjects, fetchContributionsProgress]);

  if (authLoading || loadingFinancials || loadingProjects || loadingContributions) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (financialsError || projectsError || contributionsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-destructive">Error loading dashboard: {financialsError || projectsError || contributionsError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to your cinematic financial management hub.
      </p>

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