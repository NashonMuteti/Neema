"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wallet, Banknote, Handshake } from "lucide-react"; // Added Handshake
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { cn } from "@/lib/utils";
import { FinancialAccount } from "@/types/common"; // Import FinancialAccount from common.ts

interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

interface FinancialSummaryBarProps {
  totalUnpaidPledges: number;
  activeFinancialAccounts: FinancialAccountSummary[];
  grandTotalAccountsBalance: number;
  cumulativeNetOperatingBalance: number; // New prop
}

const FinancialSummaryBar: React.FC<FinancialSummaryBarProps> = ({
  totalUnpaidPledges,
  activeFinancialAccounts,
  grandTotalAccountsBalance,
  cumulativeNetOperatingBalance, // Destructure new prop
}) => {
  const { currency } = useSystemSettings();

  return (
    <div className="flex flex-wrap gap-4"> {/* Changed gap to 4 */}
      {/* Total Unpaid Pledges Card */}
      <Card className="flex-1 min-w-[150px] transition-all duration-300 ease-in-out hover:shadow-xl bg-destructive/10 border-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Total Unpaid Pledges</CardTitle> {/* Corrected typo: Pledle -> Pledges */}
          <Handshake className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-3"> {/* Decreased padding */}
          <div className="text-xl font-bold text-destructive">{currency.symbol}{totalUnpaidPledges.toFixed(2)}</div> {/* Decreased font size */}
          <p className="text-xs text-muted-foreground">
            Outstanding commitments from members.
          </p>
        </CardContent>
      </Card>

      {/* Cumulative Net Operating Balance Card (New) */}
      <Card className="flex-1 min-w-[150px] transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cumulative Net Operating Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3"> {/* Decreased padding */}
          <div className={cn("text-xl font-bold", cumulativeNetOperatingBalance >= 0 ? "text-green-600" : "text-red-600")}> {/* Decreased font size */}
            {currency.symbol}{cumulativeNetOperatingBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total income minus total expenditure (all time).
          </p>
        </CardContent>
      </Card>

      {/* Individual Active Financial Accounts */}
      {activeFinancialAccounts.map((account) => (
        <Card key={account.id} className="flex-1 min-w-[150px] transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3"> {/* Decreased padding */}
            <div className="text-xl font-bold">{currency.symbol}{account.current_balance.toFixed(2)}</div> {/* Decreased font size */}
            <p className="text-xs text-muted-foreground">
              Current balance in this account.
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Grand Total for All Accounts Card */}
      <Card className="flex-[2_1_0%] min-w-[300px] transition-all duration-300 ease-in-out hover:shadow-xl"> {/* flex-[2_1_0%] makes it grow twice as much */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grand Total (All Accounts)</CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3"> {/* Decreased padding */}
          <div className={cn("text-xl font-bold", grandTotalAccountsBalance >= 0 ? "text-green-600" : "text-red-600")}> {/* Decreased font size */}
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