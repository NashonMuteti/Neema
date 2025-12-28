"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { MyContribution, MyFinancialAccount } from "./types"; // Import types

interface MemberContributionsDetailedProps {
  contributions: MyContribution[];
  financialAccounts: MyFinancialAccount[];
  loading: boolean;
  error: string | null;
}

const MemberContributionsDetailed: React.FC<MemberContributionsDetailedProps> = ({
  contributions,
  financialAccounts,
  loading,
  error,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading summary...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  const totalCollections = contributions
    .filter(c => c.type === "Collection")
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPledged = contributions
    .filter(c => c.type === "Pledge")
    .reduce((sum, c) => sum + (c.original_amount || 0), 0); // Sum of original pledged amounts

  const totalPaidPledges = contributions
    .filter(c => c.type === "Pledge")
    .reduce((sum, c) => sum + (c.paid_amount || 0), 0); // Sum of paid amounts towards pledges

  const totalOutstandingPledges = contributions
    .filter(c => c.type === "Pledge" && (c.paid_amount || 0) < (c.original_amount || 0))
    .reduce((sum, c) => sum + ((c.original_amount || 0) - (c.paid_amount || 0)), 0);

  const totalAccountBalance = financialAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-medium">Total Collections:</span>
          <span className="text-lg font-bold">{currency.symbol}{totalCollections.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-medium">Total Pledged (Original Amount):</span>
          <span className="text-lg font-bold">{currency.symbol}{totalPledged.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-medium">Total Paid Towards Pledges:</span>
          <span className="text-lg font-bold">{currency.symbol}{totalPaidPledges.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-medium">Total Outstanding Pledges:</span>
          <span className="text-lg font-bold text-destructive">{currency.symbol}{totalOutstandingPledges.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="font-medium">Total Account Balance:</span>
          <span className="text-xl font-bold text-primary">{currency.symbol}{totalAccountBalance.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberContributionsDetailed;