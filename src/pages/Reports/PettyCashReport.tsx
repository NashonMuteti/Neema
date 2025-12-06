"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { format, getMonth, getYear } from "date-fns";
import { Label } from "@/components/ui/label";

// Dummy financial accounts (should ideally come from a backend/admin setup)
const financialAccounts = [
  { id: "acc1", name: "Cash at Hand" },
  { id: "acc2", name: "Petty Cash" },
  { id: "acc3", name: "Bank Mpesa Account" },
  { id: "acc4", name: "Main Bank Account" },
];

interface PettyCashTransaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  purpose: string;
}

// Dummy data for petty cash transactions
const dummyPettyCashTransactions: PettyCashTransaction[] = [
  { id: "pc1", date: new Date(2023, 10, 1), amount: 50, accountId: "acc2", purpose: "Stamps for mail" },
  { id: "pc2", date: new Date(2023, 10, 7), amount: 25, accountId: "acc2", purpose: "Coffee supplies" },
  { id: "pc3", date: new Date(2023, 11, 12), amount: 100, accountId: "acc2", purpose: "Emergency office repair" },
  { id: "pc4", date: new Date(2024, 0, 3), amount: 30, accountId: "acc2", purpose: "Snacks for meeting" },
  { id: "pc5", date: new Date(2024, 0, 19), amount: 75, accountId: "acc2", purpose: "Printer ink" },
  { id: "pc6", date: new Date(2024, 0, 25), amount: 40, accountId: "acc2", purpose: "Cleaning supplies" },
  { id: "pc7", date: new Date(2024, 1, 10), amount: 60, accountId: "acc2", purpose: "Taxi fare for delivery" },
  { id: "pc8", date: new Date(2024, 1, 18), amount: 20, accountId: "acc2", purpose: "Light bulbs" },
];

const PettyCashReport = () => {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const filteredTransactions = React.useMemo(() => {
    return dummyPettyCashTransactions.filter(tx => {
      const txMonth = getMonth(tx.date);
      const txYear = getYear(tx.date);
      const matchesDate = txMonth.toString() === filterMonth && txYear.toString() === filterYear;
      const matchesSearch = tx.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  }, [filterMonth, filterYear, searchQuery]);

  const totalExpenditure = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures Report</h1>
      <p className="text-lg text-muted-foreground">
        Generate reports on all petty cash transactions and spending patterns.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Expenditure Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month" className="w-[140px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Month</SelectLabel>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="filter-year" className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Year</SelectLabel>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{tx.purpose}</TableCell>
                    <TableCell>{financialAccounts.find(acc => acc.id === tx.accountId)?.name}</TableCell>
                    <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={3}>Total Expenditure</TableCell>
                  <TableCell className="text-right">${totalExpenditure.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No petty cash transactions found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PettyCashReport;