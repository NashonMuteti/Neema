"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { format, getMonth, getYear, parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce

interface DetailedContribution {
  transaction_id: string;
  member_name: string;
  member_email: string;
  project_name: string | null;
  transaction_type: "Income" | "Pledge Payment";
  amount: number;
  transaction_date: string; // ISO string
  account_name: string;
  description: string | null;
}

const MemberContributionsDetailed = () => {
  const { currency } = useSystemSettings();
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [filterType, setFilterType] = React.useState<"All" | "Income" | "Pledge Payment">("All");
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [detailedContributions, setDetailedContributions] = React.useState<DetailedContribution[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchDetailedContributions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data, error } = await supabase.rpc('get_detailed_member_contributions', {
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
      p_transaction_type_filter: filterType === "All" ? null : filterType,
      p_search_query: debouncedSearchQuery, // Use debounced query
    });

    if (error) {
      console.error("Error fetching detailed member contributions:", error);
      setError("Failed to load detailed member contributions.");
      showError("Failed to load detailed member contributions.");
      setDetailedContributions([]);
    } else {
      setDetailedContributions(data || []);
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterType, debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchDetailedContributions();
  }, [fetchDetailedContributions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Detailed Member Contributions</h1>
        <p className="text-lg text-muted-foreground">Loading detailed contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Detailed Member Contributions</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Detailed Member Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View individual financial transactions made by members, including income and pledge payments.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
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
              <div className="grid gap-1.5">
                <Label htmlFor="filter-type">Transaction Type</Label>
                <Select value={filterType} onValueChange={(value: "All" | "Income" | "Pledge Payment") => setFilterType(value)}>
                  <SelectTrigger id="filter-type" className="w-[160px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Type</SelectLabel>
                      <SelectItem value="All">All Types</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Pledge Payment">Pledge Payment</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search member, project or description..."
                  value={localSearchQuery} // Use local state for input
                  onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {detailedContributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedContributions.map((contribution) => (
                  <TableRow key={contribution.transaction_id}>
                    <TableCell>{format(parseISO(contribution.transaction_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{contribution.member_name}</TableCell>
                    <TableCell>{contribution.transaction_type}</TableCell>
                    <TableCell>{contribution.project_name || "N/A"}</TableCell>
                    <TableCell>{contribution.account_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{contribution.description || "N/A"}</TableCell>
                    <TableCell className="text-right font-medium">{currency.symbol}{contribution.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No detailed contributions found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributionsDetailed;