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

interface PledgeReportEntry {
  pledge_id: string;
  member_name: string;
  project_name: string;
  original_amount: number;
  paid_amount: number;
  balance_due: number;
  due_date: string; // ISO string
  status: "Active" | "Paid" | "Overdue";
}

const PledgeReport = () => {
  const { currency } = useSystemSettings();
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Paid" | "Overdue">("All");
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [pledgeReport, setPledgeReport] = React.useState<PledgeReportEntry[]>([]);
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

  const fetchPledgeReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data, error } = await supabase.rpc('get_pledge_report', {
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
      p_status_filter: filterStatus === "All" ? null : filterStatus,
      p_search_query: debouncedSearchQuery, // Use debounced query
    });

    if (error) {
      console.error("Error fetching pledge report:", error);
      setError("Failed to load pledge report.");
      showError("Failed to load pledge report.");
      setPledgeReport([]);
    } else {
      setPledgeReport(data || []);
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterStatus, debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchPledgeReport();
  }, [fetchPledgeReport]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-muted-foreground">Loading pledge report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
      <p className="text-lg text-muted-foreground">
        Comprehensive overview of all pledges, their status, and financial details.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Pledge Details</CardTitle>
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
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={(value: "All" | "Active" | "Paid" | "Overdue") => setFilterStatus(value)}>
                  <SelectTrigger id="filter-status" className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search member or project..."
                  value={localSearchQuery} // Use local state for input
                  onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {pledgeReport.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pledgeReport.map((pledge) => (
                  <TableRow key={pledge.pledge_id}>
                    <TableCell className="font-medium">{pledge.member_name}</TableCell>
                    <TableCell>{pledge.project_name}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{pledge.original_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{pledge.paid_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currency.symbol}{pledge.balance_due.toFixed(2)}
                    </TableCell>
                    <TableCell>{format(parseISO(pledge.due_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${pledge.status === "Paid" ? "text-green-600" : pledge.status === "Overdue" ? "text-destructive" : "text-yellow-600"}`}>
                        {pledge.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No pledges found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PledgeReport;