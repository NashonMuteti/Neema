"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MonthYearOption } from "@/types/common"; // Updated import

interface PledgeFiltersProps {
  filterStatus: "All" | "Paid" | "Unpaid"; // Updated filter options
  setFilterStatus: (status: "All" | "Paid" | "Unpaid") => void; // Updated filter options
  // Removed filterMonth and setFilterMonth props
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: MonthYearOption[];
  years: MonthYearOption[];
}

const PledgeFilters: React.FC<PledgeFiltersProps> = ({
  filterStatus,
  setFilterStatus,
  // Removed filterMonth
  // Removed setFilterMonth
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="grid gap-1.5 flex-1 min-w-[120px]">
        <Label htmlFor="filter-status">Status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger id="filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All Pledges</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem> {/* Consolidated Active and Overdue */}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {/* Removed Month Filter */}
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
      <div className="relative flex items-center flex-1 min-w-[180px]">
        <Input
          type="text"
          placeholder="Search member/project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
        <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default PledgeFilters;