"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTableBankingData } from "@/hooks/useTableBankingData";
import TableBankingSummaryFilters from "@/components/banking-summary/TableBankingSummaryFilters";
import ContributionsSummaryTable from "@/components/banking-summary/ContributionsSummaryTable";
import DebtsSummaryTable from "@/components/banking-summary/DebtsSummaryTable";
import { getMonth, getYear } from "date-fns";

const TableBankingSummary: React.FC = () => {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [filterPeriod, setFilterPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const {
    financialAccounts,
    loading,
    error,
    filteredCollections,
    groupedContributions,
    grandTotal,
    filteredDebts,
    totalOutstandingDebts,
    getPeriodLabel,
    months,
    years,
  } = useTableBankingData({
    filterPeriod,
    selectedDate,
    selectedMonth,
    selectedYear,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
        <p className="text-lg text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
      <p className="text-lg text-muted-foreground">
        View a summary of all contributions per financial account, filtered by various time periods.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Contributions & Debts Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableBankingSummaryFilters
            filterPeriod={filterPeriod}
            setFilterPeriod={setFilterPeriod}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            months={months}
            years={years}
          />

          <ContributionsSummaryTable
            financialAccounts={financialAccounts}
            groupedContributions={groupedContributions}
            filteredCollections={filteredCollections}
            grandTotal={grandTotal}
            getPeriodLabel={getPeriodLabel}
          />

          <DebtsSummaryTable
            filteredDebts={filteredDebts}
            totalOutstandingDebts={totalOutstandingDebts}
            getPeriodLabel={getPeriodLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBankingSummary;