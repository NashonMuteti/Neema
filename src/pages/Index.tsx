"use client";

import React, { useMemo } from "react";
import SoonDueProjectsGraph from "@/components/dashboard/SoonDueProjectsGraph";
import ContributionsProgressGraph from "@/components/dashboard/ContributionsProgressGraph";
import IncomeExpenditureGraph from "@/components/dashboard/IncomeExpenditureGraph";
import FinancialSummaryBar from "@/components/dashboard/FinancialSummaryBar";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

// Import the new custom hooks
import { useFinancialData } from "@/hooks/dashboard/useFinancialData";
import { useDashboardProjects } from "@/hooks/dashboard/useDashboardProjects";
import { useContributionsProgress } from "@/hooks/dashboard/useContributionsProgress";
import { useFinancialSummary } from "@/hooks/dashboard/useFinancialSummary";

const Index = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { headerTitle } = useBranding();
  
  const isAdmin = useMemo(() => currentUser?.role === "Admin" || currentUser?.role === "Super Admin", [currentUser]);

  // Use the new custom hooks
  const { monthlyFinancialData, availableYears, loadingFinancials, financialsError } = useFinancialData();
  const { dashboardProjects, loadingProjects, projectsError } = useDashboardProjects();
  const { contributionsProgressData, loadingContributions, contributionsError } = useContributionsProgress();
  const {
    totalUnpaidPledges,
    activeFinancialAccounts,
    grandTotalAccountsBalance,
    cumulativeNetOperatingBalance,
    loadingSummary,
    summaryError,
  } = useFinancialSummary();

  const isLoading = authLoading || loadingFinancials || loadingProjects || loadingContributions || loadingSummary;
  const anyError = financialsError || projectsError || contributionsError || summaryError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-lg text-destructive">Error loading dashboard: {anyError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to {headerTitle} Financial Hub.
      </p>

      <FinancialSummaryBar
        totalUnpaidPledges={totalUnpaidPledges}
        activeFinancialAccounts={activeFinancialAccounts}
        grandTotalAccountsBalance={grandTotalAccountsBalance}
        cumulativeNetOperatingBalance={cumulativeNetOperatingBalance}
      />

      <IncomeExpenditureGraph allFinancialData={monthlyFinancialData} availableYears={availableYears} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SoonDueProjectsGraph projects={dashboardProjects} />
        <ContributionsProgressGraph projectsData={contributionsProgressData} />
      </div>
    </div>
  );
};

export default Index;