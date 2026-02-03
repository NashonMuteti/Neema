"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTableBankingData } from "@/hooks/useTableBankingData";
import TableBankingSummaryFilters from "@/components/banking-summary/TableBankingSummaryFilters";
import ContributionsSummaryTable from "@/components/banking-summary/ContributionsSummaryTable";
import DebtsSummaryTable from "@/components/banking-summary/DebtsSummaryTable";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import ReportActions from "@/components/reports/ReportActions";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const TableBankingSummary: React.FC = () => {
  const { currency } = useSystemSettings();
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [filterPeriod, setFilterPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "range">("monthly");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const {
    financialAccounts,
    loading,
    error,
    groupedContributions,
    contributionIncomeTx,
    grandTotal,
    filteredDebts,
    totalOutstandingDebts,
    getPeriodLabel,
    months,
    years,
    accountCashflow,
    cashflowTotals,
  } = useTableBankingData({
    filterPeriod,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedRange,
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

  const cashflowRows = financialAccounts.map((acc) => {
    const cf = accountCashflow[acc.id] || { income: 0, expenditure: 0, net: 0 };
    return [
      acc.name,
      `${currency.symbol}${cf.income.toFixed(2)}`,
      `${currency.symbol}${cf.expenditure.toFixed(2)}`,
      `${currency.symbol}${cf.net.toFixed(2)}`,
    ];
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
      <p className="text-lg text-muted-foreground">
        Summary of contributions, debts, and account cashflow. Use the filters to select a period or a custom date range.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TableBankingSummaryFilters
            filterPeriod={filterPeriod}
            setFilterPeriod={setFilterPeriod}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedRange={selectedRange}
            setSelectedRange={setSelectedRange}
            months={months}
            years={years}
          />

          {/* Account cashflow (Income/Expenditure) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">Account Cashflow</h3>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
              <ReportActions
                title="Table Banking Summary (Cashflow)"
                subtitle={subtitle}
                columns={["Account", "Income", "Expenditure", "Net"]}
                rows={[
                  ...cashflowRows,
                  [
                    "TOTAL",
                    `${currency.symbol}${cashflowTotals.income.toFixed(2)}`,
                    `${currency.symbol}${cashflowTotals.expenditure.toFixed(2)}`,
                    `${currency.symbol}${cashflowTotals.net.toFixed(2)}`,
                  ],
                ]}
              />
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenditure</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialAccounts.map((acc) => {
                    const cf = accountCashflow[acc.id] || { income: 0, expenditure: 0, net: 0 };
                    return (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium">{acc.name}</TableCell>
                        <TableCell className="text-right text-green-700 font-semibold">
                          {currency.symbol}{cf.income.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-700 font-semibold">
                          {currency.symbol}{cf.expenditure.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-bold",
                            cf.net >= 0 ? "text-green-700" : "text-destructive",
                          )}
                        >
                          {currency.symbol}{cf.net.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right text-green-700">{currency.symbol}{cashflowTotals.income.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-700">{currency.symbol}{cashflowTotals.expenditure.toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right", cashflowTotals.net >= 0 ? "text-green-700" : "text-destructive")}>
                      {currency.symbol}{cashflowTotals.net.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Contributions */}
          <div className="space-y-3">
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
              contributionIncomeTx={contributionIncomeTx}
              grandTotal={grandTotal}
              getPeriodLabel={getPeriodLabel}
            />
          </div>

          {/* Debts */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBankingSummary;