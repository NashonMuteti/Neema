"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, CheckCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { validateFinancialTransaction } from "@/utils/security";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

const TransferFunds = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();

  const { canManageFundsTransfer } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageFundsTransfer: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageFundsTransfer = currentUserPrivileges.includes("Manage Funds Transfer");
    return { canManageFundsTransfer };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceAccount, setSourceAccount] = useState<string | undefined>(undefined);
  const [destinationAccount, setDestinationAccount] = useState<string | undefined>(undefined);
  const [transferAmount, setTransferAmount] = useState("");
  const [transactionCost, setTransactionCost] = useState(""); // New state for transaction cost
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchFinancialAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance')
      .eq('profile_id', currentUser.id)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching financial accounts:", error);
      setError("Failed to load financial accounts.");
      showError("Failed to load financial accounts.");
      setFinancialAccounts([]);
    } else {
      setFinancialAccounts(data || []);
      if (data && data.length > 0) {
        if (!sourceAccount) setSourceAccount(data[0].id);
        if (!destinationAccount && data.length > 1) setDestinationAccount(data[1].id);
      }
    }
    setLoading(false);
  }, [currentUser, sourceAccount, destinationAccount]);

  useEffect(() => {
    fetchFinancialAccounts();
  }, [fetchFinancialAccounts]);

  const handleTransferFunds = async () => {
    if (!canManageFundsTransfer) {
      showError("You do not have permission to transfer funds.");
      return;
    }
    if (!sourceAccount || !destinationAccount || !transferAmount) {
      showError("Transfer amount, source, and destination accounts are required.");
      return;
    }
    if (sourceAccount === destinationAccount) {
      showError("Source and destination accounts cannot be the same.");
      return;
    }

    const amount = parseFloat(transferAmount);
    const parsedTransactionCost = parseFloat(transactionCost || "0"); // Parse transaction cost, default to 0 if empty

    // Validate main transfer amount
    const validation = validateFinancialTransaction(amount, sourceAccount, currentUser?.id || '');
    if (!validation.isValid) {
      showError(validation.error || "Invalid transfer amount.");
      return;
    }

    // Validate transaction cost
    if (isNaN(parsedTransactionCost) || parsedTransactionCost < 0) {
      showError("Transaction cost must be a non-negative number.");
      return;
    }

    const sourceAcc = financialAccounts.find(acc => acc.id === sourceAccount);
    const destAcc = financialAccounts.find(acc => acc.id === destinationAccount);

    if (!sourceAcc || !destAcc) {
      showError("Selected accounts not found.");
      return;
    }

    const totalDeductionFromSource = amount + parsedTransactionCost;
    if (sourceAcc.current_balance < totalDeductionFromSource) {
      showError("Insufficient balance in the source account to cover transfer and transaction cost.");
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Perform the main fund transfer using the atomic function
      const { error: transferError } = await supabase.rpc('transfer_funds_atomic', {
        p_source_account_id: sourceAccount,
        p_destination_account_id: destinationAccount,
        p_amount: amount,
        p_actor_profile_id: currentUser?.id, // The user performing the action
        p_purpose: `Funds Transfer to ${destAcc.name}`,
        p_source: `Funds Transfer from ${sourceAcc.name}`,
        p_is_transfer: true,
        p_project_id: null,
        p_member_id: null,
        p_payment_method: null,
        p_pledge_id: null,
        p_transaction_profile_id: currentUser?.id, // The transaction is for the current user
      });

      if (transferError) throw transferError;

      // 2. If there's a transaction cost, record it as a separate expenditure
      if (parsedTransactionCost > 0) {
        const { error: costError } = await supabase.rpc('transfer_funds_atomic', {
          p_source_account_id: sourceAccount,
          p_destination_account_id: null, // No destination for a standalone expenditure
          p_amount: parsedTransactionCost,
          p_actor_profile_id: currentUser?.id, // The user performing the action
          p_purpose: `Transaction Cost for Transfer to ${destAcc.name}`,
          p_source: `Transaction Cost`, // This field is for income, but required by RPC. Will be ignored.
          p_is_transfer: false, // This is a standalone expenditure, not a transfer
          p_project_id: null,
          p_member_id: null,
          p_payment_method: null,
          p_pledge_id: null,
          p_transaction_profile_id: currentUser?.id, // The transaction is for the current user
        });
        if (costError) throw costError;
      }

      showSuccess("Funds transferred successfully!");
      setTransferAmount("");
      setTransactionCost(""); // Reset transaction cost
      fetchFinancialAccounts(); // Re-fetch to update balances
    } catch (err: any) {
      console.error("Error during fund transfer:", err);
      showError(`Failed to transfer funds: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Transfer Funds</h1>
        <p className="text-lg text-muted-foreground">Loading financial accounts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Transfer Funds</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Transfer Funds</h1>
      <p className="text-lg text-muted-foreground">
        Move money between your different financial accounts.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Initiate Fund Transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="source-account">From Account</Label>
            <Select value={sourceAccount} onValueChange={setSourceAccount} disabled={!canManageFundsTransfer || isTransferring || financialAccounts.length === 0}>
              <SelectTrigger id="source-account">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Your Accounts</SelectLabel>
                  {financialAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {financialAccounts.length === 0 && <p className="text-sm text-muted-foreground">No financial accounts found. Please add some accounts first.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="destination-account">To Account</Label>
            <Select value={destinationAccount} onValueChange={setDestinationAccount} disabled={!canManageFundsTransfer || isTransferring || financialAccounts.length < 2}>
              <SelectTrigger id="destination-account">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Your Accounts</SelectLabel>
                  {financialAccounts
                    .filter(account => account.id !== sourceAccount)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {financialAccounts.length < 2 && <p className="text-sm text-muted-foreground">Need at least two accounts to transfer funds.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="transfer-amount">Amount to Transfer</Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              disabled={!canManageFundsTransfer || isTransferring}
            />
          </div>

          {/* New Transaction Cost Field */}
          <div className="grid gap-1.5">
            <Label htmlFor="transaction-cost">Transaction Cost ({currency.symbol})</Label>
            <Input
              id="transaction-cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={transactionCost}
              onChange={(e) => setTransactionCost(e.target.value)}
              disabled={!canManageFundsTransfer || isTransferring}
            />
          </div>

          <Button
            onClick={handleTransferFunds}
            className="w-full"
            disabled={!canManageFundsTransfer || isTransferring || !sourceAccount || !destinationAccount || !transferAmount || financialAccounts.length < 2 || sourceAccount === destinationAccount}
          >
            {isTransferring ? "Transferring..." : <><ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Funds</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferFunds;