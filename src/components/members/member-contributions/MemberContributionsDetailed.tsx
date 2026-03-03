"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { exportTableToPdf } from "@/utils/reportUtils";
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
  const { brandLogoUrl, tagline } = useBranding();
  const { currentUser } = useAuth();

  // Filter transactions to only show 'income' and 'pledge' types
  const filteredContributionsAndPledges = React.useMemo(() => {
    return memberContributions.filter(c => c.type === 'income' || c.type === 'pledge' || c.type === 'expenditure'); // Added expenditure
  }, [memberContributions]);

  const handlePrint = async () => {
    const columns = ["Date", "Type", "Description", "Account/Project", "Amount", "Due Date"];

    const rows = filteredContributionsAndPledges.map((c) => {
      const status = getContributionStatus(c.type, c.status);
      const isIncomeOrPaidPledge = c.type === 'income' || (c.type === 'pledge' && c.status === 'Paid');

      const amountStr = `${isIncomeOrPaidPledge ? "+" : "-"}${currency.symbol}${c.amount.toFixed(2)}`;

      return [
        format(c.date, "MMM dd, yyyy"),
        status.text,
        c.sourceOrPurpose,
        c.accountName,
        amountStr,
        c.type === 'pledge' && c.dueDate ? format(c.dueDate, "MMM dd, yyyy") : "-",
      ];
    });

    await exportTableToPdf({
      title: `Detailed Contributions & Pledges for ${memberName} (${filterYear})`,
      subtitle: currentUser?.name ? `prepared by: ${currentUser.name}` : undefined,
      fileName: `Member_Contributions_Detailed_${memberName}_${filterYear}`,
      columns,
      rows,
      brandLogoUrl,
      tagline,
      mode: "open",
      orientation: "auto",
    });
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Detailed Contributions & Pledges for {memberName} ({filterYear})</CardTitle> {/* Updated title */}
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
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