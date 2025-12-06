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

interface ExpenditureTransaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  purpose: string;
}

const Expenditure = () => {
  const { currentUser } = useAuth(); // Use the auth context
  const { userRoles: definedRoles } = useUserRoles(); // Get all defined roles

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageExpenditure = currentUserPrivileges.includes("Manage Expenditure");

  // Form State
  const [expenditureDate, setExpenditureDate] = React.useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = React.useState("");
  const [expenditureAccount, setExpenditureAccount] = React.useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = React.useState("");

  // Transactions List State
  const [transactions, setTransactions] = React.useState<ExpenditureTransaction[]>([
    { id: "exp1", date: new Date(2023, 10, 10), amount: 250, accountId: "acc2", purpose: "Office Supplies" },
    { id: "exp2", date: new Date(2023, 10, 18), amount: 1200, accountId: "acc4", purpose: "Equipment Rental" },
    { id: "exp3", date: new Date(2023, 11, 1), amount: 300, accountId: "acc1", purpose: "Travel Expenses" },
    { id: "exp4", date: new Date(2024, 0, 5), amount: 800, accountId: "acc3", purpose: "Marketing Materials" },
    { id: "exp5", date: new Date(2024, 0, 20), amount: 150, accountId: "acc2", purpose: "Petty Cash Refill" },
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

  const handlePostExpenditure = () => {
    if (!expenditureDate || !expenditureAmount || !expenditureAccount || !expenditurePurpose) {
      showError("All expenditure fields are required.");
      return;
    }
    const amount = parseFloat(expenditureAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive expenditure amount.");
      return;
    }

    const newTransaction: ExpenditureTransaction = {
      id: `exp${transactions.length + 1}`,
      date: expenditureDate,
      amount,
      accountId: expenditureAccount,
      purpose: expenditurePurpose,
    };

    setTransactions((prev) => [...prev, newTransaction]);
    showSuccess("Expenditure posted successfully!");
    // Reset form
    setExpenditureDate(new Date());
    setExpenditureAmount("");
    setExpenditureAccount(undefined);
    setExpenditurePurpose("");
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing expenditure transaction:", id);
    showSuccess(`Edit functionality for transaction ${id} (placeholder).`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    showSuccess("Expenditure transaction deleted successfully!");
    console.log("Deleting expenditure transaction:", id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Expenditure</h1>
      <p className="text-lg text-muted-foreground">
        Record and manage all financial outflows.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Expenditure Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-date">Date of Expenditure</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenditureDate && "text-muted-foreground"
                    )}
                    disabled={!canManageExpenditure}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenditureDate ? format(expenditureDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenditureDate}
                    onSelect={setExpenditureDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-amount">Amount</Label>
              <Input
                id="expenditure-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenditureAmount}
                onChange={(e) => setExpenditureAmount(e.target.value)}
                disabled={!canManageExpenditure}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-account">Debited From Account</Label>
              <Select value={expenditureAccount} onValueChange={setExpenditureAccount} disabled={!canManageExpenditure}>
                <SelectTrigger id="expenditure-account">
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
              <Label htmlFor="expenditure-purpose">Purpose/Description</Label>
              <Textarea
                id="expenditure-purpose"
                placeholder="e.g., Equipment rental, Travel expenses, Office supplies"
                value={expenditurePurpose}
                onChange={(e) => setExpenditurePurpose(e.target.value)}
                disabled={!canManageExpenditure}
              />
            </div>

            <Button onClick={handlePostExpenditure} className="w-full" disabled={!canManageExpenditure}>
              Post Expenditure
            </Button>
          </CardContent>
        </Card>

        {/* Recent Expenditure Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Expenditure Transactions</CardTitle>
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
                    {canManageExpenditure && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{tx.purpose}</TableCell>
                      <TableCell>{financialAccounts.find(acc => acc.id === tx.accountId)?.name}</TableCell>
                      <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                      {canManageExpenditure && (
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
              <p className="text-muted-foreground">No expenditure transactions found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Expenditure;