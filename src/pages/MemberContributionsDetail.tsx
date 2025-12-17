"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Search, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useViewingMember } from "@/context/ViewingMemberContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

interface MemberContribution {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash';
  sourceOrPurpose: string;
  date: Date;
  amount: number;
  accountName: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getContributionStatus = (type: MemberContribution['type']): { text: string; variant: BadgeVariant } => {
  if (type === 'income') {
    return { text: "Income", variant: "default" };
  } else if (type === 'expenditure') {
    return { text: "Expenditure", variant: "destructive" };
  } else if (type === 'petty_cash') {
    return { text: "Petty Cash", variant: "secondary" };
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

const MemberContributionsDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { setViewingMemberName } = useViewingMember();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [memberName, setMemberName] = useState("Unknown Member");
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

  const fetchMemberData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!memberId) {
      setError("Member ID is missing.");
      setLoading(false);
      return;
    }

    // Fetch member name
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', memberId)
      .single();

    if (profileError) {
      console.error("Error fetching member profile:", profileError);
      setError("Failed to load member profile.");
      setLoading(false);
      return;
    }

    if (profileData) {
      setMemberName(profileData.name || profileData.email || "Unknown Member");
      setViewingMemberName(profileData.name || profileData.email || "Unknown Member");
    } else {
      setError("Member not found.");
      setLoading(false);
      return;
    }

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name)') as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    const { data: expenditureData, error: expenditureError } = await supabase
      .from('expenditure_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)') as { data: ExpenditureTxRow[] | null, error: PostgrestError | null };

    const { data: pettyCashData, error: pettyCashError } = await supabase
      .from('petty_cash_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)') as { data: PettyCashTxRow[] | null, error: PostgrestError | null };

    if (incomeError || expenditureError || pettyCashError) {
      console.error("Error fetching contributions:", incomeError || expenditureError || pettyCashError);
      setError("Failed to load member's contributions.");
      setMemberContributions([]);
    } else {
      const allContributions: MemberContribution[] = [];

      incomeData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'income',
        sourceOrPurpose: tx.source,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));

      expenditureData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'expenditure',
        sourceOrPurpose: tx.purpose,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));

      pettyCashData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'petty_cash',
        sourceOrPurpose: tx.purpose,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));

      const filteredAndSorted = allContributions
        .filter(c => c.sourceOrPurpose.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

      setMemberContributions(filteredAndSorted);
    }
    setLoading(false);
  }, [memberId, filterMonth, filterYear, searchQuery, setViewingMemberName]);

  useEffect(() => {
    fetchMemberData();
    return () => {
      setViewingMemberName(null); // Clear the name when component unmounts
    };
  }, [fetchMemberData, setViewingMemberName]);

  const totalIncome = memberContributions.filter(c => c.type === 'income').reduce((sum, c) => sum + c.amount, 0);
  const totalExpenditure = memberContributions.filter(c => c.type === 'expenditure' || c.type === 'petty_cash').reduce((sum, c) => sum + c.amount, 0);
  const netBalance = totalIncome - totalExpenditure;

  const contributionsByDate = memberContributions.reduce((acc, contribution) => {
    const dateKey = format(contribution.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, MemberContribution[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = contributionsByDate[dateKey];
    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayContributions && dayContributions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <span className="h-1 w-1 rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions</h1>
        <p className="text-lg text-muted-foreground">Loading member contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions</h1>
        <p className="text-lg text-destructive">{error}</p>
        <Link to="/members">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/members">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{memberName}'s Contributions</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Detailed view of {memberName}'s financial activities.
      </p>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Transactions</TabsTrigger>
        </TabsList>

        {/* Contributions Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar and Filters */}
            <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl">
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

            {/* Financial Summary */}
            <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader>
                <CardTitle>Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Total Income:</p>
                  <p className="text-xl font-bold text-primary">${totalIncome.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Total Expenditure:</p>
                  <p className="text-xl font-bold text-destructive">${totalExpenditure.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-muted-foreground">Net Balance:</p>
                  <p className={cn("text-xl font-bold", netBalance >= 0 ? "text-green-600" : "text-red-600")}>
                    ${netBalance.toFixed(2)}
                  </p>
                </div>

                {selectedDate && contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-lg">Activity on {format(selectedDate, "PPP")}</h3>
                    {contributionsByDate[format(selectedDate, "yyyy-MM-dd")].map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-sm">
                        <span>{c.sourceOrPurpose} ({c.accountName})</span>
                        <Badge variant={getContributionStatus(c.type).variant}>
                          {c.type === 'income' ? '+' : '-'}${c.amount.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && !contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <p className="text-muted-foreground text-sm mt-6">No activity on {format(selectedDate, "PPP")}.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Contributions Tab Content */}
        <TabsContent value="detailed" className="space-y-6 mt-6">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>Detailed Transactions for {memberName} ({months[parseInt(filterMonth)].label} {filterYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="filter-month-detailed">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger id="filter-month-detailed" className="w-[140px]">
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
                    <Label htmlFor="filter-year-detailed">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger id="filter-year-detailed" className="w-[120px]">
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

              {memberContributions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberContributions.map((contribution) => {
                      const status = getContributionStatus(contribution.type);
                      return (
                        <TableRow key={contribution.id}>
                          <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.text}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{contribution.sourceOrPurpose}</TableCell>
                          <TableCell>{contribution.accountName}</TableCell>
                          <TableCell className="text-right">
                            {contribution.type === 'income' ? '+' : '-'}${contribution.amount.toFixed(2)}
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

export default MemberContributionsDetail;