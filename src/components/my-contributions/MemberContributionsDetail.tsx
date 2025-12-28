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
import { format } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { MyContribution, MyFinancialAccount } from "@/types/common"; // Import types from common.ts

interface MemberContributionsDetailProps {
  contributions: MyContribution[];
  financialAccounts: MyFinancialAccount[];
  loading: boolean;
  error: string | null;
}

const MemberContributionsDetail: React.FC<MemberContributionsDetailProps> = ({
  contributions,
  financialAccounts,
  loading,
  error,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading detailed contributions...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  const sortedContributions = [...contributions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedContributions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Pledged Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContributions.map((contribution) => {
                const isPledge = contribution.type === "Pledge";
                const remaining = isPledge && contribution.original_amount !== undefined && contribution.paid_amount !== undefined
                  ? contribution.original_amount - contribution.paid_amount
                  : 0;
                const displayStatus = isPledge && contribution.original_amount !== undefined && contribution.paid_amount !== undefined
                  ? (contribution.paid_amount >= contribution.original_amount ? "Paid" : "Active")
                  : "-";

                return (
                  <TableRow key={contribution.id}>
                    <TableCell>{format(contribution.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{contribution.project_name}</TableCell>
                    <TableCell>{contribution.type}</TableCell>
                    <TableCell className="text-right">
                      {isPledge && contribution.original_amount !== undefined
                        ? `${currency.symbol}${contribution.original_amount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && contribution.paid_amount !== undefined
                        ? `${currency.symbol}${contribution.paid_amount.toFixed(2)}`
                        : isPledge ? `${currency.symbol}0.00` : `${currency.symbol}${contribution.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPledge && remaining > 0
                        ? `${currency.symbol}${remaining.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isPledge && contribution.due_date
                        ? format(contribution.due_date, "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{displayStatus}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No detailed contributions found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberContributionsDetail;