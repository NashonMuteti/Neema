"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, getYear } from "date-fns";

interface MonthlyFinancialData {
  month: string;
  income: number;
  expenditure: number;
}

interface IncomeExpenditureGraphProps {
  financialData: MonthlyFinancialData[];
  availableYears: number[];
}

const IncomeExpenditureGraph: React.FC<IncomeExpenditureGraphProps> = ({
  financialData,
  availableYears,
}) => {
  const currentYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());

  // Filter data by selected year (dummy data is already yearly, but this prepares for real data)
  const filteredData = financialData; // For now, assuming financialData is already for the selected year or will be filtered by parent

  const totalIncome = filteredData.reduce((sum, item) => sum + item.income, 0);
  const totalExpenditure = filteredData.reduce((sum, item) => sum + item.expenditure, 0);
  const netBalance = totalIncome - totalExpenditure;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          <p className="text-sm font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">Financial Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Select Year" />
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
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={filteredData}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
            <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--primary))" name="Income">
              <LabelList dataKey="income" position="top" fill="hsl(var(--foreground))" formatter={(value: number) => `$${value.toFixed(0)}`} />
            </Bar>
            <Bar dataKey="expenditure" fill="hsl(var(--destructive))" name="Expenditure">
              <LabelList dataKey="expenditure" position="top" fill="hsl(var(--foreground))" formatter={(value: number) => `$${value.toFixed(0)}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Income ({selectedYear})</p>
            <p className="text-xl font-bold text-primary">${totalIncome.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Expenditure ({selectedYear})</p>
            <p className="text-xl font-bold text-destructive">${totalExpenditure.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net Balance ({selectedYear})</p>
            <p className={`text-xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${netBalance.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Monthly breakdown of financial inflows and outflows for the selected year.
        </p>
      </CardContent>
    </Card>
  );
};

export default IncomeExpenditureGraph;