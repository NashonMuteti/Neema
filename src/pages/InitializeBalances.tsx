"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InitializeBalancesDialog from "@/components/admin/InitializeBalancesDialog"; // Import the new dialog
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { FinancialAccount } from "@/types/common"; // Updated import

const InitializeBalances = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context

  const { canInitializeBalances } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canInitializeBalances: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canInitializeBalances = currentUserPrivileges.includes("Initialize Balances");
    return { canInitializeBalances };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id') // Added initial_balance and profile_id
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching financial accounts for initialization:", error);
      setError("Failed to load financial accounts for initialization.");
      setFinancialAccounts([]);
    } else {
      setFinancialAccounts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFinancialAccounts();
  }, [fetchFinancialAccounts]);

  const handleInitialize = async (balances: Record<string, number>) => {
    if (!currentUser) {
      showError("You must be logged in to initialize balances.");
      return;
    }

    let hasError = false;
    for (const accountId in balances) {
      const newBalance = balances[accountId];
      
      // 1. Update the financial account's current_balance
      const { error: updateAccountError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', accountId)
        .eq('profile_id', currentUser.id); // Ensure user owns the account

      if (updateAccountError) {
        console.error(`Error updating balance for account ${accountId}:`, updateAccountError);
        showError(`Failed to update balance for ${financialAccounts.find(acc => acc.id === accountId)?.name || accountId}.`);
        hasError = true;
        continue;
      }

      // 2. Update or create the corresponding "Initial Account Balance" income transaction
      const { data: existingIncomeTx, error: fetchTxError } = await supabase
        .from('income_transactions')
        .select('id')
        .eq('account_id', accountId)
        .eq('profile_id', currentUser.id)
        .eq('source', 'Initial Account Balance')
        .single();

      if (fetchTxError && fetchTxError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error checking for existing initial balance transaction:", fetchTxError);
        showError("Account balance updated, but failed to verify initial balance income transaction.");
        hasError = true;
      } else if (existingIncomeTx) {
        // Update existing transaction
        const { error: updateTxError } = await supabase
          .from('income_transactions')
          .update({ amount: newBalance })
          .eq('id', existingIncomeTx.id);
        if (updateTxError) {
          console.error("Error updating initial balance income transaction:", updateTxError);
          showError("Account balance updated, but failed to update initial balance income transaction.");
        }
      } else {
        // Create new transaction if not found
        const { error: createTxError } = await supabase
          .from('income_transactions')
          .insert({
            profile_id: currentUser.id,
            account_id: accountId,
            amount: newBalance,
            source: "Initial Account Balance",
            date: new Date().toISOString(),
          });
        if (createTxError) {
          console.error("Error creating initial balance income transaction:", createTxError);
          showError("Account balance updated, but failed to create initial balance income transaction.");
        }
      }
    }

    if (!hasError) {
      showSuccess("Account balances initialized successfully!");
      fetchFinancialAccounts(); // Re-fetch to update the displayed balances
    } else {
      showError("Some account balances or their corresponding income transactions failed to update. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Initialize Account Balances</h1>
        <p className="text-lg text-muted-foreground">Loading financial accounts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Initialize Account Balances</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Initialize Account Balances</h1>
      <p className="text-lg text-muted-foreground">
        Use this feature to reset or set default values for all financial accounts in the system.
        This action is typically performed when starting fresh or during major financial resets.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Account Balance Initialization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive">
            <span className="font-bold">Warning:</span> This is a critical operation and cannot be easily undone.
            Ensure you have backed up any necessary data before proceeding.
          </p>
          {canInitializeBalances ? (
            <InitializeBalancesDialog onInitialize={handleInitialize} financialAccounts={financialAccounts} />
          ) : (
            <p className="text-muted-foreground">You do not have permission to initialize balances.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InitializeBalances;