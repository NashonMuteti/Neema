"use client";

import React, { useMemo } from "react";
import SoonDueProjectsGraph from "@/components/dashboard/SoonDueProjectsGraph";
import ContributionsProgressGraph from "@/components/dashboard/ContributionsProgressGraph";
import IncomeExpenditureGraph from "@/components/dashboard/IncomeExpenditureGraph";
import FinancialSummaryBar from "@/components/dashboard/FinancialSummaryBar";
import DashboardTableBankingCalendar from "@/components/dashboard/DashboardTableBankingCalendar"; // New import

import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

// Import the new custom hooks
import { useFinancialData } from "@/hooks/dashboard/useFinancialData";
import { useDashboardProjects } from "@/hooks/dashboard/useDashboardProjects";
import { useContributionsProgress } from "@/hooks/dashboard/useContributionsProgress";
import { useFinancialSummary } from "@/hooks/dashboard/useFinancialSummary";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";


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
    totalOutstandingDebts, // Destructure new field
    activeFinancialAccounts,
    grandTotalAccountsBalance,
    cumulativeNetOperatingBalance,
    loadingSummary,
    summaryError,
  } = useFinancialSummary();

  const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());

  // Set initial selected year once availableYears are loaded
  React.useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0].toString());
    }
  }, [availableYears, selectedYear]);

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
        Welcome to your Financial Hub!
      </p>

      <FinancialSummaryBar
        totalUnpaidPledges={totalUnpaidPledges}
        totalOutstandingDebts={totalOutstandingDebts} // Pass new prop
        activeFinancialAccounts={activeFinancialAccounts}
        grandTotalAccountsBalance={grandTotalAccountsBalance}
        cumulativeNetOperatingBalance={cumulativeNetOperatingBalance}
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="grid gap-1.5">
          <Label htmlFor="financial-graph-year">Select Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger id="financial-graph-year" className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Year</SelectLabel>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <IncomeExpenditureGraph financialData={monthlyFinancialData} selectedYear={parseInt(selectedYear)} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SoonDueProjectsGraph projects={dashboardProjects} />
        <ContributionsProgressGraph projectsData={contributionsProgressData} />
      </div>

      <DashboardTableBankingCalendar /> {/* New: Display the table banking calendar */}
    </div>
  );
};

export default Index;