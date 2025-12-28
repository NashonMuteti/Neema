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

interface MyContributionsOverviewTabProps {
  contributions: MyContribution[];
  loading: boolean;
  error: string | null;
}

const MyContributionsOverviewTab: React.FC<MyContributionsOverviewTabProps> = ({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedContributions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContributions.map((contribution) => {
                const displayStatus = getDisplayPledgeStatus(contribution);
                const isPledge = contribution.type === "Pledge";
                const remaining = isPledge && contribution.original_amount !== undefined && contribution.paid_amount !== undefined
                  ? contribution.original_amount - contribution.paid_amount
                  : 0;

                return (
                  <TableRow key={contribution.id}>
                    <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{contribution.project_name}</TableCell>
                    <TableCell>{contribution.type}</TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}{contribution.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && contribution.paid_amount !== undefined
                        ? `${currency.symbol}${contribution.paid_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && remaining > 0
                        ? `${currency.symbol}${remaining.toFixed(2)}`
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
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No contributions found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsOverviewTab;