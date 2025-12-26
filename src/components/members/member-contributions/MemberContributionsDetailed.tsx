"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getContributionStatus, MemberContribution } from "./types";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

interface MemberContributionsDetailedProps {
  memberName: string;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  memberContributions: MemberContribution[];
}

const MemberContributionsDetailed: React.FC<MemberContributionsDetailedProps> = ({
  memberName,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
  memberContributions
}) => {
  const { currency } = useSystemSettings(); // Use currency from context

  return (
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
                <TableHead>Account/Project</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead> {/* New column */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberContributions.map((contribution) => {
                const status = getContributionStatus(contribution.type, contribution.status);
                const isIncomeOrPaidPledge = contribution.type === 'income' || (contribution.type === 'pledge' && contribution.status === 'Paid');
                return (
                  <TableRow key={contribution.id}>
                    <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{contribution.sourceOrPurpose}</TableCell>
                    <TableCell>{contribution.accountName}</TableCell>
                    <TableCell className="text-right">
                      {isIncomeOrPaidPledge ? '+' : '-'}{currency.symbol}{contribution.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {contribution.type === 'pledge' && contribution.dueDate ? format(contribution.dueDate, "MMM dd, yyyy") : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center mt-4">
            No transactions found for the selected period or matching your search.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberContributionsDetailed;