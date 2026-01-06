"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { MonthlyFinancialData } from "@/types/common"; // Import MonthlyFinancialData from common.ts

interface IncomeExpenditureGraphProps {
  financialData: MonthlyFinancialData[];
  selectedYear: number;
}

const IncomeExpenditureGraph: React.FC<IncomeExpenditureGraphProps> = ({
  financialData,
  selectedYear,
}) => {
  const { currency } = useSystemSettings(); // Use currency from context

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Create a full 12-month data structure for the selected year
  const fullYearData: MonthlyFinancialData[] = monthOrder.map(monthName => ({
    year: selectedYear,
    month: monthName,
    income: 0,
    expenditure: 0,
    outstandingPledges: 0,
    outstandingDebts: 0, // Initialize new field
  }));

  // Merge actual financial data into the full year structure
  financialData
    .filter((data) => data.year === selectedYear)
    .forEach((dataPoint) => {
      const monthIndex = monthOrder.indexOf(dataPoint.month);
      if (monthIndex !== -1) {
        fullYearData[monthIndex] = {
          ...fullYearData[monthIndex],
          ...dataPoint,
        };
      }
    });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          <p className="text-sm font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {currency.symbol}{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Income, Expenditure, Outstanding Pledges & Debts ({selectedYear})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={fullYearData} // Use fullYearData to ensure all 12 months are displayed
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
            <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
              content={<CustomTooltip />} // Use custom tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--primary))"
              name="Income"
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="expenditure"
              stroke="hsl(var(--destructive))"
              name="Expenditure"
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="outstandingPledges"
              stroke="hsl(var(--ring))" // Use a distinct color for pledges
              name="Outstanding Pledges"
              activeDot={{ r: 8 }}
            />
            <Line // New Line for Outstanding Debts
              type="monotone"
              dataKey="outstandingDebts"
              stroke="hsl(var(--yellow-600))" // Use a distinct color, e.g., yellow-600
              name="Outstanding Debts"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Monthly breakdown of financial activity, outstanding commitments, and debts.
        </p>
      </CardContent>
    </Card>
  );
};

export default IncomeExpenditureGraph;