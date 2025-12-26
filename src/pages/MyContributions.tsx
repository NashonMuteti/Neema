"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, getMonth, getYear, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useSystemSettings } from "@/context/SystemSettingsContext";

// Unified Transaction interface
interface Transaction {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash' | 'pledge';
  date: Date; // For sorting and calendar display
  amount: number;
  description: string; // sourceOrPurpose for financial, project_name for pledge
  accountOrProjectName: string; // accountName for financial, project_name for pledge
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getContributionStatus = (type: Transaction['type'], status?: Transaction['status']): { text: string; variant: BadgeVariant } => {
  if (type === 'income') {
    return { text: "Income", variant: "default" };
  } else if (type === 'expenditure') {
    return { text: "Expenditure", variant: "destructive" };
  } else if (type === 'petty_cash') {
    return { text: "Petty Cash", variant: "secondary" };
  } else if (type === 'pledge') {
    if (status === 'Paid') {
      return { text: "Pledge (Paid)", variant: "default" };
    } else if (status === 'Active' || status === 'Overdue') {
      return { text: "Pledge (Pending)", variant: "destructive" };
    }
  }
  return { text: "Unknown", variant: "outline" };
};

// Define expected structure for joined financial_accounts data
interface FinancialAccountName {
  name: string;
}

interface IncomeTxRow {
  id: string;
  date: string;
  amount: number;
  source: string;
  financial_accounts: FinancialAccountName | null;
}

interface ExpenditureTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccountName | null;
}

interface PettyCashTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccountName | null;
}

interface PledgeTxRow {
  id: string;
  due_date: string;
  amount: number;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: { name: string } | null;
}

interface UserProject {
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

const MyContributions: React.FC = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { currency } = useSystemSettings();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [myProjects, setMyProjects] = useState<UserProject[]>([]); // State for user's projects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchMyContributions = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const allTransactions: Transaction[] = [];

    // Fetch Income Transactions
    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    if (incomeError) console.error("Error fetching income transactions:", incomeError);
    incomeData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'income',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.source,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account'
    }));

    // Fetch Expenditure Transactions
    const { data: expenditureData, error: expenditureError } = await supabase
      .from('expenditure_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: ExpenditureTxRow[] | null, error: PostgrestError | null };

    if (expenditureError) console.error("Error fetching expenditure transactions:", expenditureError);
    expenditureData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'expenditure',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.purpose,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account'
    }));

    // Fetch Petty Cash Transactions
    const { data: pettyCashData, error: pettyCashError } = await supabase
      .from('petty_cash_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: PettyCashTxRow[] | null, error: PostgrestError | null };

    if (pettyCashError) console.error("Error fetching petty cash transactions:", pettyCashError);
    pettyCashData?.forEach(tx => allTransactions.push({
      id: tx.id,
      type: 'petty_cash',
      date: parseISO(tx.date),
      amount: tx.amount,
      description: tx.purpose,
      accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account'
    }));

    // Fetch Project Pledges
    const { data: pledgesData, error: pledgesError } = await supabase
      .from('project_pledges')
      .select('id, due_date, amount, status, comments, projects(name)')
      .eq('member_id', currentUser.id)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString()) as { data: PledgeTxRow[] | null, error: PostgrestError | null };

    if (pledgesError) console.error("Error fetching pledges:", pledgesError);
    pledgesData?.forEach(pledge => allTransactions.push({
      id: pledge.id,
      type: 'pledge',
      date: parseISO(pledge.due_date), // Use due_date as the transaction date for pledges
      amount: pledge.amount,
      description: pledge.comments || pledge.projects?.name || 'Project Pledge',
      accountOrProjectName: pledge.projects?.name || 'Unknown Project',
      status: pledge.status,
      dueDate: parseISO(pledge.due_date),
    }));

    // Fetch user's projects for expected contributions
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, member_contribution_amount')
      .eq('profile_id', currentUser.id)
      .eq('status', 'Open'); // Only open projects

    if (projectsError) console.error("Error fetching user projects:", projectsError);
    setMyProjects(projectsData || []);

    const filteredAndSorted = allTransactions
      .filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.accountOrProjectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

    setMyTransactions(filteredAndSorted);
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    if (!authLoading) {
      fetchMyContributions();
    }
  }, [authLoading, fetchMyContributions]);

  const totalIncome = myTransactions.filter(t => t.type === 'income' || (t.type === 'pledge' && t.status === 'Paid')).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenditure = myTransactions.filter(t => t.type === 'expenditure' || t.type === 'petty_cash').reduce((sum, t) => sum + t.amount, 0);
  const totalPaidPledges = myTransactions.filter(t => t.type === 'pledge' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const totalPendingPledges = myTransactions.filter(t => t.type === 'pledge' && (t.status === 'Active' || t.status === 'Overdue')).reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenditure;

  const transactionsByDate = myTransactions.reduce((acc, transaction) => {
    const dateKey = format(transaction.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey];
    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayTransactions && dayTransactions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <span className="h-1 w-1 rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Contributions</h1>
        <p className="text-lg text-muted-foreground">Loading your contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Contributions</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View your personal financial activities and project pledges.
      </p>

      <Tabs defaultValue="my-contributions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-contributions">Overview</TabsTrigger>
          <TabsTrigger value="my-detailed-contributions">Detailed Transactions</TabsTrigger>
        </TabsList>

        {/* My Contributions Overview Tab Content */}
        <TabsContent value="my-contributions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar and Filters */}
            <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader>
                <CardTitle>Activity Calendar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-stretch space-y-4">
                <div className="flex flex-wrap gap-4 justify-center">
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-[140px]">
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
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-[120px]">
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
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border shadow w-full"
                  month={new Date(parseInt(filterYear), parseInt(filterMonth))}
                  onMonthChange={(month) => {
                    setFilterMonth(getMonth(month).toString());
                    setFilterYear(getYear(month).toString());
                  }}
                  components={{
                    DayContent: ({ date }) => renderDay(date),
                  }}
                />
              </CardContent>
            </Card>

            {/* NEW CARD: Activity on Selected Date */}
            <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader>
                <CardTitle>Activity on {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDate && transactionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <>
                    {transactionsByDate[format(selectedDate, "yyyy-MM-dd")].map((t) => {
                      const status = getContributionStatus(t.type, t.status);
                      return (
                        <div key={t.id} className="flex justify-between items-center text-sm">
                          <span>{t.description} ({t.accountOrProjectName})</span>
                          <Badge variant={status.variant}>
                            {t.type === 'income' || (t.type === 'pledge' && t.status === 'Paid') ? '+' : '-'}{currency.symbol}{t.amount.toFixed(2)}
                          </Badge>
                        </div>
                      );
                    })}
                  </>
                )}
                {selectedDate && !transactionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <p className="text-muted-foreground text-sm">No activity on {format(selectedDate, "PPP")}.</p>
                )}
                {!selectedDate && (
                  <p className="text-muted-foreground text-sm">Select a date on the calendar to view activity.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* MODIFIED CARD: Financial Summary (now only Net Balance, Pledge Summary and Expected Project Contributions) */}
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Net Balance */}
              <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Net Balance:</p>
                <p className={cn("text-xl font-bold", netBalance >= 0 ? "text-green-600" : "text-red-600")}>
                  {currency.symbol}{netBalance.toFixed(2)}
                </p>
              </div>
              
              {/* Pledge Summary */}
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">Pledge Summary</h3>
                <div className="flex justify-between items-center text-sm">
                  <p className="text-muted-foreground">Total Paid Pledges:</p>
                  <p className="font-bold text-primary">{currency.symbol}{totalPaidPledges.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <p className="text-muted-foreground">Total Pending Pledges:</p>
                  <p className="font-bold text-destructive">{currency.symbol}{totalPendingPledges.toFixed(2)}</p>
                </div>
              </div>

              {/* Expected Project Contributions */}
              {myProjects.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold text-lg">Expected Project Contributions</h3>
                  {myProjects.map(project => (
                    <div key={project.id} className="flex justify-between items-center text-sm">
                      <span>{project.name}:</span>
                      <span className="font-medium">{currency.symbol}{(project.member_contribution_amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Detailed Contributions Tab Content */}
        <TabsContent value="my-detailed-contributions" className="space-y-6 mt-6">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>My Detailed Transactions for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="filter-month-all">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger id="filter-month-all" className="w-[140px]">
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
                    <Label htmlFor="filter-year-all">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger id="filter-year-all" className="w-[120px]">
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
                      placeholder="Search description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

              {myTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account/Project</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead> {/* New column for pledges */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myTransactions.map((transaction) => {
                      const status = getContributionStatus(transaction.type, transaction.status);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>{format(transaction.date, "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.text}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell>{transaction.accountOrProjectName}</TableCell>
                          <TableCell className="text-right">
                            {transaction.type === 'income' || (transaction.type === 'pledge' && transaction.status === 'Paid') ? '+' : '-'}{currency.symbol}{transaction.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {transaction.dueDate ? format(transaction.dueDate, "MMM dd, yyyy") : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center mt-4">No transactions found for the selected period or matching your search.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyContributions;