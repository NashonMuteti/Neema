"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InitializeBalancesDialog from "@/components/admin/InitializeBalancesDialog"; // Import the new dialog
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

const InitializeBalances = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

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
      .select('id, name, current_balance')
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
    // In a real application, this would trigger a backend process
    // to reset or set default values for all account balances.
    console.log("Initializing all account balances with:", balances);

    let hasError = false;
    for (const accountId in balances) {
      const newBalance = balances[accountId];
      const { error } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', accountId);

      if (error) {
        console.error(`Error updating balance for account ${accountId}:`, error);
        showError(`Failed to update balance for ${financialAccounts.find(acc => acc.id === accountId)?.name || accountId}.`);
        hasError = true;
      }
    }

    if (!hasError) {
      showSuccess("Account balances initialized successfully!");
      fetchFinancialAccounts(); // Re-fetch to update the displayed balances
    } else {
      showError("Some account balances failed to update. Check console for details.");
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