"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTableBankingData } from "@/hooks/useTableBankingData";
import TableBankingSummaryFilters from "@/components/banking-summary/TableBankingSummaryFilters";
import ContributionsSummaryTable from "@/components/banking-summary/ContributionsSummaryTable";
import DebtsSummaryTable from "@/components/banking-summary/DebtsSummaryTable";
import { format, getMonth, getYear } from "date-fns";
import ReportActions from "@/components/reports/ReportActions";
import { useSystemSettings } from "@/context/SystemSettingsContext";

const TableBankingSummary: React.FC = () => {
  const { currency } = useSystemSettings();
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

  const subtitle = `Period: ${getPeriodLabel()}`;

  const contributionRows = financialAccounts.map((acc) => [
    acc.name,
    `${currency.symbol}${(groupedContributions[acc.id] || 0).toFixed(2)}`,
  ]);

  const debtRows = filteredDebts.map((d) => [
    d.debtor_name,
    d.description,
    d.due_date ? format(d.due_date, "MMM dd, yyyy") : "N/A",
    `${currency.symbol}${d.amount_due.toFixed(2)}`,
    d.status,
  ]);

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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Contributions Summary</h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <ReportActions
              title="Table Banking Summary (Contributions)"
              subtitle={subtitle}
              columns={["Financial Account", "Total Contributions"]}
              rows={[...contributionRows, ["Grand Total", `${currency.symbol}${grandTotal.toFixed(2)}`]]}
            />
          </div>

          <ContributionsSummaryTable
            financialAccounts={financialAccounts}
            groupedContributions={groupedContributions}
            filteredCollections={filteredCollections}
            grandTotal={grandTotal}
            getPeriodLabel={getPeriodLabel}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div>
              <h3 className="text-xl font-semibold">Debts Summary</h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <ReportActions
              title="Table Banking Summary (Debts)"
              subtitle={subtitle}
              columns={["Debtor", "Description", "Due Date", "Amount Due", "Status"]}
              rows={[
                ...debtRows,
                ["Total Outstanding", "", "", `${currency.symbol}${totalOutstandingDebts.toFixed(2)}`, ""],
              ]}
            />
          </div>

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