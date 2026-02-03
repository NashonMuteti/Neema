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

  const getDisplayStatus = (
    contribution: MyContribution,
  ): "Paid" | "Unpaid" | "Active" | "Overdue" | undefined => {
    if (contribution.type === "Pledge" || contribution.type === "Debt") {
      if (contribution.status === "Paid") return "Paid";
      if (contribution.status === "Active") return "Active";
      if (contribution.status === "Overdue") return "Overdue";
      // Fallback for pledges/debts if status is not explicitly set but paid_amount covers original
      if (contribution.original_amount !== undefined && contribution.paid_amount !== undefined) {
        if (contribution.paid_amount >= contribution.original_amount) return "Paid";
        return "Unpaid";
      }
    }
    return undefined;
  };

  const getStatusBadgeClasses = (
    displayStatus: "Paid" | "Unpaid" | "Active" | "Overdue" | undefined,
  ) => {
    switch (displayStatus) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Unpaid":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
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

  const sortedContributions = [...contributions].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const totalExpected = sortedContributions.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const totalActualPaid = sortedContributions.reduce((sum, c) => {
    if (c.type === "Collection") return sum + c.amount;
    if (c.type === "Pledge" || c.type === "Debt") return sum + (c.paid_amount || 0);
    return sum;
  }, 0);
  const totalBalance = sortedContributions.reduce((sum, c) => sum + (c.balance_amount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Contributions & Debts</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedContributions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Expected/Original</TableHead>
                <TableHead className="text-right">Actual Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContributions.map((contribution) => {
                const displayStatus = getDisplayStatus(contribution);
                const isPledgeOrDebt =
                  contribution.type === "Pledge" || contribution.type === "Debt";

                return (
                  <TableRow key={contribution.id}>
                    <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {contribution.project_name || contribution.description || "N/A"}
                    </TableCell>
                    <TableCell>{contribution.type}</TableCell>
                    <TableCell className="text-right">
                      {contribution.expected_amount !== undefined
                        ? `${currency.symbol}${contribution.expected_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledgeOrDebt && contribution.paid_amount !== undefined
                        ? `${currency.symbol}${contribution.paid_amount.toFixed(2)}`
                        : contribution.type === "Collection"
                          ? `${currency.symbol}${contribution.amount.toFixed(2)}`
                          : `${currency.symbol}0.00`}
                    </TableCell>
                    <TableCell className="text-right">
                      {contribution.balance_amount !== undefined
                        ? `${currency.symbol}${contribution.balance_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isPledgeOrDebt && contribution.due_date
                        ? format(contribution.due_date, "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPledgeOrDebt && displayStatus ? (
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
              <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {totalExpected.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {totalActualPaid.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {totalBalance.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No contributions or debts found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsTable;