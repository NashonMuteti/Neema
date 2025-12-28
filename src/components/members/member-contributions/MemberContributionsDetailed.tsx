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
import { MemberContribution } from "@/types/common"; // Updated import path
import { getContributionStatus } from "@/utils/contributionUtils";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

interface MemberContributionsDetailedProps {
  memberName: string;
  filterMonth: string; // Still passed for consistency, but not used for data filtering in this component
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  memberContributions: MemberContribution[]; // This now contains yearly data
}

const MemberContributionsDetailed: React.FC<MemberContributionsDetailedProps> = ({
  memberName,
  filterMonth, // Not directly used for filtering here, as data is yearly
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

  // Filter transactions to only show 'income' and 'pledge' types
  const filteredContributionsAndPledges = React.useMemo(() => {
    return memberContributions.filter(c => c.type === 'income' || c.type === 'pledge');
  }, [memberContributions]);

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Detailed Contributions & Pledges for {memberName} ({filterYear})</CardTitle> {/* Updated title */}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          {/* Removed month and year selectors as data is now yearly */}
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
        
        {filteredContributionsAndPledges.length > 0 ? (
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
              {filteredContributionsAndPledges.map((contribution) => {
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
            No contributions or pledges found for the selected year or matching your search.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberContributionsDetailed;