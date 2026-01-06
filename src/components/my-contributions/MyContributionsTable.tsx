"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { MyContribution } from "@/types/common"; // Import MyContribution type from common.ts

interface MyContributionsTableProps {
  contributions: MyContribution[];
  loading: boolean;
  error: string | null;
}

const MyContributionsTable: React.FC<MyContributionsTableProps> = ({
  contributions,
  loading,
  error,
}) => {
  const { currency } = useSystemSettings();

  const getDisplayPledgeStatus = (contribution: MyContribution): "Paid" | "Unpaid" | undefined => {
    if (contribution.type === "Pledge" && contribution.original_amount !== undefined && contribution.paid_amount !== undefined) {
      if (contribution.paid_amount >= contribution.original_amount) return "Paid";
      return "Unpaid";
    }
    return undefined;
  };

  const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid" | undefined) => {
    switch (displayStatus) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Unpaid":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading your contributions...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  const sortedContributions = [...contributions].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate subtotals
  const totalExpected = sortedContributions.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const totalPledged = sortedContributions
    .filter(c => c.type === "Pledge")
    .reduce((sum, c) => sum + (c.original_amount || 0), 0);
  const totalPaid = sortedContributions
    .filter(c => c.type === "Pledge")
    .reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  // Sum of balance_amount for all contributions
  const totalBalance = sortedContributions.reduce((sum, c) => sum + (c.balance_amount || 0), 0);


  return (
    <Card>
      <CardHeader>
        <CardTitle>All Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedContributions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Expected Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Pledged Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead> {/* Renamed from Remaining */}
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContributions.map((contribution) => {
                const displayStatus = getDisplayPledgeStatus(contribution);
                const isPledge = contribution.type === "Pledge";

                return (
                  <TableRow key={contribution.id}>
                    <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{contribution.project_name}</TableCell>
                    <TableCell>{contribution.type}</TableCell>
                    <TableCell className="text-right">
                      {contribution.expected_amount !== undefined
                        ? `${currency.symbol}${contribution.expected_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && contribution.paid_amount !== undefined
                        ? `${currency.symbol}${contribution.paid_amount.toFixed(2)}`
                        : isPledge ? `${currency.symbol}0.00` : `${currency.symbol}${contribution.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && contribution.original_amount !== undefined
                        ? `${currency.symbol}${contribution.original_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {contribution.balance_amount !== undefined
                        ? `${currency.symbol}${contribution.balance_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isPledge && contribution.due_date
                        ? format(contribution.due_date, "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPledge && displayStatus ? (
                        <Badge className={getStatusBadgeClasses(displayStatus)}>
                          {displayStatus}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Subtotals Row */}
              <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">{currency.symbol}{totalExpected.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currency.symbol}{totalPaid.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currency.symbol}{totalPledged.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currency.symbol}{totalBalance.toFixed(2)}</TableCell> {/* Updated total */}
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No contributions found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsTable;