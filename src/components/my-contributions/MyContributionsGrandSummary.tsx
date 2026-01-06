"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Scale, Handshake, Wallet, PiggyBank } from "lucide-react"; // Icons

interface MyContributionsGrandSummaryProps {
  totalCollections: number;
  totalPledged: number;
  totalPaidPledges: number;
  totalOutstandingDebt: number;
  loading: boolean;
}

const MyContributionsGrandSummary: React.FC<MyContributionsGrandSummaryProps> = ({
  totalCollections,
  totalPledged,
  totalPaidPledges,
  totalOutstandingDebt,
  loading,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading summary...</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="flex flex-col justify-between p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold">
            {currency.symbol}{totalCollections.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            All amounts you've contributed
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
          <Handshake className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold">
            {currency.symbol}{totalPledged.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total amount you've pledged
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Towards Pledges</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold">
            {currency.symbol}{totalPaidPledges.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Amount paid for your pledges
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Debt</CardTitle>
          <Scale className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {currency.symbol}{totalOutstandingDebt.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total amount you owe
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyContributionsGrandSummary;