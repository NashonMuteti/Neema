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

interface MemberContribution {
  member_id: string;
  member_name: string;
  member_email: string;
  total_contributed: number;
  last_contribution_date: string | null; // ISO string
}

const MemberContributions = () => {
  const { currency } = useSystemSettings();
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [contributions, setContributions] = React.useState<MemberContribution[]>([]);
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

  const fetchMemberContributions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data, error } = await supabase.rpc('get_member_contributions_summary', {
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
      p_search_query: debouncedSearchQuery, // Use debounced query
    });

    if (error) {
      console.error("Error fetching member contributions:", error);
      setError("Failed to load member contributions.");
      showError("Failed to load member contributions.");
      setContributions([]);
    } else {
      setContributions(data || []);
    }
    setLoading(false);
  }, [filterMonth, filterYear, debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchMemberContributions();
  }, [fetchMemberContributions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
        <p className="text-lg text-muted-foreground">Loading member contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
      <p className="text-lg text-muted-foreground">
        View a summary of financial contributions made by each member.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Contributions Summary</CardTitle>
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
                  placeholder="Search member..."
                  value={localSearchQuery} // Use local state for input
                  onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {contributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Member Email</TableHead>
                  <TableHead className="text-right">Total Contributed</TableHead>
                  <TableHead>Last Contribution Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((contribution) => (
                  <TableRow key={contribution.member_id}>
                    <TableCell className="font-medium">{contribution.member_name}</TableCell>
                    <TableCell>{contribution.member_email}</TableCell>
                    <TableCell className="text-right font-medium">{currency.symbol}{contribution.total_contributed.toFixed(2)}</TableCell>
                    <TableCell>
                      {contribution.last_contribution_date
                        ? format(parseISO(contribution.last_contribution_date), "MMM dd, yyyy")
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No member contributions found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributions;