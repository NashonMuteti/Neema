"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, getMonth, getYear } from "date-fns";
import { CalendarIcon, Edit, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Dummy financial accounts (should ideally come from a backend/admin setup)
const financialAccounts = [
  { id: "acc1", name: "Cash at Hand" },
  { id: "acc2", name: "Petty Cash" },
  { id: "acc3", name: "Bank Mpesa Account" },
  { id: "acc4", name: "Main Bank Account" },
];

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  source: string;
}

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

const Income = () => {
  // Form State
  const [incomeDate, setIncomeDate] = React.useState<Date | undefined>(new Date());
  const [incomeAmount, setIncomeAmount] = React.useState("");
  const [incomeAccount, setIncomeAccount] = React.useState<string | undefined>(undefined);
  const [incomeSource, setIncomeSource] = React.useState("");

  // Transactions List State
  const [transactions, setTransactions] = React.useState<IncomeTransaction[]>([
    { id: "inc1", date: new Date(2023, 10, 15), amount: 1500, accountId: "acc1", source: "Grant from Film Fund" },
    { id: "inc2", date: new Date(2023, 10, 20), amount: 500, accountId: "acc2", source: "Donation from Sponsor" },
    { id: "inc3", date: new Date(2023, 11, 5), amount: 2000, accountId: "acc3", source: "Crowdfunding" },
    { id: "inc4", date: new Date(2024, 0, 10), amount: 1000, accountId: "acc4", source: "Investment Return" },
    { id: "inc5", date: new Date(2024, 0, 25), amount: 750, accountId: "acc1", source: "Merchandise Sales" },
  ]);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const filteredTransactions = transactions.filter(tx => {
    const txMonth = getMonth(tx.date);
    const txYear = getYear(tx.date);
    return txMonth.toString() === filterMonth && txYear.toString() === filterYear;
  }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

  const handlePostIncome = () => {
    if (!incomeDate || !incomeAmount || !incomeAccount || !incomeSource) {
      showError("All income fields are required.");
      return;
    }
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive income amount.");
      return;
    }

    const newTransaction: IncomeTransaction = {
      id: `inc${transactions.length + 1}`,
      date: incomeDate,
      amount,
      accountId: incomeAccount,
      source: incomeSource,
    };

    setTransactions((prev) => [...prev, newTransaction]);
    showSuccess("Income posted successfully!");
    // Reset form
    setIncomeDate(new Date());
    setIncomeAmount("");
    setIncomeAccount(undefined);
    setIncomeSource("");
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing income transaction:", id);
    showSuccess(`Edit functionality for transaction ${id} (placeholder).`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    showSuccess("Income transaction deleted successfully!");
    console.log("Deleting income transaction:", id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Income</h1>
      <p className="text-lg text-muted-foreground">
        Record and manage all financial inflows.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Income Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="income-date">Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !incomeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {incomeDate ? format(incomeDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={incomeDate}
                    onSelect={setIncomeDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="income-amount">Amount</Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="income-account">Received Into Account</Label>
              <Select value={incomeAccount} onValueChange={setIncomeAccount}>
                <SelectTrigger id="income-account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Financial Accounts</SelectLabel>
                    {financialAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="income-source">Source/Description</Label>
              <Textarea
                id="income-source"
                placeholder="e.g., Grant from Film Fund, Donation from Sponsor"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
              />
            </div>

            <Button onClick={handlePostIncome} className="w-full">
              Post Income
            </Button>
          </CardContent>
        </Card>

        {/* Recent Income Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Income Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="grid gap-1.5 flex-1 min-w-[120px]">
                <Label htmlFor="filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[100px]">
                <Label htmlFor="filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="filter-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{tx.source}</TableCell>
                      <TableCell>{financialAccounts.find(acc => acc.id === tx.accountId)?.name}</TableCell>
                      <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No income transactions found for the selected period.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Income;