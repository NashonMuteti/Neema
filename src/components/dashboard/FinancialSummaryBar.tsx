"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wallet, Banknote, Handshake, Scale } from "lucide-react";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { cn } from "@/lib/utils";

interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

interface FinancialSummaryBarProps {
  totalUnpaidPledges: number;
  totalOutstandingDebts: number;
  activeFinancialAccounts: FinancialAccountSummary[];
  grandTotalAccountsBalance: number;
  cumulativeNetOperatingBalance: number;
}

const FinancialSummaryBar: React.FC<FinancialSummaryBarProps> = ({
  totalUnpaidPledges,
  totalOutstandingDebts,
  activeFinancialAccounts,
  grandTotalAccountsBalance,
  cumulativeNetOperatingBalance,
}) => {
  const { currency } = useSystemSettings();

  return (
    <div className="space-y-4">
      {/* Row 1: key totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl bg-destructive/10 border-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Total Unpaid Pledges</CardTitle>
            <Handshake className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-destructive">
              {currency.symbol}
              {totalUnpaidPledges.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding commitments from members.</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl bg-yellow-100/10 border-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Total Outstanding Debts</CardTitle>
            <Scale className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-xl font-bold text-yellow-600">
              {currency.symbol}
              {totalOutstandingDebts.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total amount owed to the organization.</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Operating Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            <div
              className={cn(
                "text-xl font-bold",
                cumulativeNetOperatingBalance >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {currency.symbol}
              {cumulativeNetOperatingBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total income minus total expenditure (all time).</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grand Total (All Accounts)</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            <div
              className={cn(
                "text-xl font-bold",
                grandTotalAccountsBalance >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {currency.symbol}
              {grandTotalAccountsBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Combined balance across all financial accounts.</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: account balances */}
      {activeFinancialAccounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeFinancialAccounts.map((account) => (
            <Card key={account.id} className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3">
                <div className="text-xl font-bold">
                  {currency.symbol}
                  {account.current_balance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Current balance in this account.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default FinancialSummaryBar;