"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { DollarSign, Scale } from "lucide-react"; // Icons

interface MyContributionsAnalysisSummaryProps {
  totalContributed: number;
  balanceToPay: number;
  loading: boolean;
}

const MyContributionsAnalysisSummary: React.FC<MyContributionsAnalysisSummaryProps> = ({
  totalContributed,
  balanceToPay,
  loading,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading summary analysis...</p>;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Grand Summary Analysis</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <DollarSign className="h-6 w-6 text-green-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Contributed</p>
            <p className="text-2xl font-bold">{currency.symbol}{totalContributed.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Your total payments towards projects and pledges.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Scale className="h-6 w-6 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Balance to Pay</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {currency.symbol}{balanceToPay.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Total outstanding amount for pledges and debts.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyContributionsAnalysisSummary;