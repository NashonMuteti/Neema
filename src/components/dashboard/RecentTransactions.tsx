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
import { useRecentTransactions } from "@/hooks/dashboard/useRecentTransactions";
import { getContributionStatus } from "@/utils/contributionUtils";
import { Loader2 } from "lucide-react";

const RecentTransactions: React.FC = () => {
  const { currency } = useSystemSettings();
  const { recentTransactions, loadingRecentTransactions, recentTransactionsError } = useRecentTransactions(5); // Fetch top 5

  if (loadingRecentTransactions) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading recent transactions...</p>
        </CardContent>
      </Card>
    );
  }

  if (recentTransactionsError) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading recent transactions: {recentTransactionsError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => {
                const status = getContributionStatus(transaction.type, transaction.status);
                const isIncome = transaction.type === 'income';
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.accountOrProjectName}</TableCell>
                    <TableCell className="text-right">
                      <span className={isIncome ? "text-green-600" : "text-red-600"}>
                        {isIncome ? '+' : '-'}{currency.symbol}{transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center mt-4">No recent transactions found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;