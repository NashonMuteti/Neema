"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wallet, Banknote, Handshake } from "lucide-react"; // Added Handshake
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { cn } from "@/lib/utils";

interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

interface FinancialSummaryBarProps {
  totalUnpaidPledges: number;
  activeFinancialAccounts: FinancialAccountSummary[];
  grandTotalAccountsBalance: number;
}

const FinancialSummaryBar: React.FC<FinancialSummaryBarProps> = ({
  totalUnpaidPledges,
  activeFinancialAccounts,
  grandTotalAccountsBalance,
}) => {
  const { currency } = useSystemSettings();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Unpaid Pledges Card */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl bg-destructive/10 border-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Total Unpaid Pledle</CardTitle>
          <Handshake className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{currency.symbol}{totalUnpaidPledges.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Outstanding commitments from members.
          </p>
        </CardContent>
      </Card>

      {/* Individual Active Financial Accounts */}
      {activeFinancialAccounts.map((account) => (
        <Card key={account.id} className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency.symbol}{account.current_balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current balance in this account.
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Grand Total for All Accounts Card */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grand Total (All Accounts)</CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", grandTotalAccountsBalance >= 0 ? "text-green-600" : "text-red-600")}>
            {currency.symbol}{grandTotalAccountsBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Combined balance across all financial accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryBar;