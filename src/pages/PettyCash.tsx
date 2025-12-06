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
import { CalendarIcon, Edit, Trash2, Search } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useUserRoles } from "@/context/UserRolesContext"; // New import

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

const PettyCash = () => {
  const { currentUser } = useAuth(); // Use the auth context
  const { userRoles: definedRoles } = useUserRoles(); // Get all defined roles

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManagePettyCash = currentUserPrivileges.includes("Manage Petty Cash");

  // Form State
  const [expenseDate, setExpenseDate] = React.useState<Date | undefined>(new Date());
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [expenseAccount, setExpenseAccount] = React.useState<string | undefined>(undefined);
  const [expensePurpose, setExpensePurpose] = React.useState("");

  // Transactions List State
  const [transactions, setTransactions] = React.useState<PettyCashTransaction[]>([
    { id: "pc1", date: new Date(2023, 10, 1), amount: 50, accountId: "acc2", purpose: "Stamps for mail" },
    { id: "pc2", date: new Date(2023, 10, 7), amount: 25, accountId: "acc2", purpose: "Coffee supplies" },
    { id: "pc3", date: new Date(2023, 11, 12), amount: 100, accountId: "acc2", purpose: "Emergency office repair" },
    { id: "pc4", date: new Date(2024, 0, 3), amount: 30, accountId: "acc2", purpose: "Snacks for meeting" },
    { id: "pc5", date: new Date(2024, 0, 19), amount: 75, accountId: "acc2", purpose: "Printer ink" },
  ]);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState(""); // New: Search query state

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(tx => {
      const txMonth = getMonth(tx.date);
      const txYear = getYear(tx.date);
      const matchesDate = txMonth.toString() === filterMonth && txYear.toString() === filterYear;
      const matchesSearch = tx.purpose.toLowerCase().includes(searchQuery.toLowerCase()); // New: Filter by search query
      return matchesDate && matchesSearch;
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  }, [transactions, filterMonth, filterYear, searchQuery]); // Added searchQuery to dependencies

  const handlePostExpense = () => {
    if (!expenseDate || !expenseAmount || !expenseAccount || !expensePurpose) {
      showError("All petty cash fields are required.");
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive expense amount.");
      return;
    }

    const newTransaction: PettyCashTransaction = {
      id: `pc${transactions.length + 1}`,
      date: expenseDate,
      amount,
      accountId: expenseAccount,
      purpose: expensePurpose,
    };

    setTransactions((prev) => [...prev, newTransaction]);
    showSuccess("Petty cash expense posted successfully!");
    // Reset form
    setExpenseDate(new Date());
    setExpenseAmount("");
    setExpenseAccount(undefined);
    setExpensePurpose("");
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing petty cash transaction:", id);
    showSuccess(`Edit functionality for transaction ${id} (placeholder).`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    showSuccess("Petty cash transaction deleted successfully!");
    console.log("Deleting petty cash transaction:", id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures</h1>
      <p className="text-lg text-muted-foreground">
        Track and manage all petty cash expenses.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Petty Cash Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Petty Cash Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="expense-date">Date of Expense</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenseDate && "text-muted-foreground"
                    )}
                    disabled={!canManagePettyCash}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={setExpenseDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                disabled={!canManagePettyCash}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="expense-account">Debited From Account</Label>
              <Select value={expenseAccount} onValueChange={setExpenseAccount} disabled={!canManagePettyCash}>
                <SelectTrigger id="expense-account">
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
              <Label htmlFor="expense-purpose">Purpose/Description</Label>
              <Textarea
                id="expense-purpose"
                placeholder="e.g., Office supplies, Snacks, Transportation"
                value={expensePurpose}
                onChange={(e) => setExpensePurpose(e.target.value)}
                disabled={!canManagePettyCash}
              />
            </div>

            <Button onClick={handlePostExpense} className="w-full" disabled={!canManagePettyCash}>
              Post Expense
            </Button>
          </CardContent>
        </Card>

        {/* Recent Petty Cash Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Petty Cash Transactions</CardTitle>
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
              {/* New: Search Input */}
              <div className="relative flex items-center flex-1 min-w-[180px]">
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

            {filteredTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canManagePettyCash && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{tx.purpose}</TableCell>
                      <TableCell>{financialAccounts.find(acc => acc.id === tx.accountId)?.name}</TableCell>
                      <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                      {canManagePettyCash && (
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
              <p className="text-muted-foreground">No petty cash transactions found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PettyCash;