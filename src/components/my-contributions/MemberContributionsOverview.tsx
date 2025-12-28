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
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { MyFinancialAccount } from "./types"; // Import MyFinancialAccount type

interface MemberContributionsOverviewProps {
  financialAccounts: MyFinancialAccount[];
  loading: boolean;
  error: string | null;
}

const MemberContributionsOverview: React.FC<MemberContributionsOverviewProps> = ({
  financialAccounts,
  loading,
  error,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading financial accounts...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Financial Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {financialAccounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{account.current_balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No financial accounts found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberContributionsOverview;