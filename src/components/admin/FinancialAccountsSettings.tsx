"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, Wallet } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { FinancialAccount } from "@/types/common"; // Updated import

const FinancialAccountsSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context

  const { canManageFinancialAccounts } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageFinancialAccounts: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageFinancialAccounts = currentUserPrivileges.includes("Manage Financial Accounts");
    return { canManageFinancialAccounts };
  }, [currentUser, definedRoles]);

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState("0");

  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountInitialBalance, setEditAccountInitialBalance] = useState("");

  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('profile_id', currentUser.id)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching financial accounts:", error);
      setError("Failed to load financial accounts.");
      showError("Failed to load financial accounts.");
      setAccounts([]);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = async () => {
    if (!currentUser) {
      showError("You must be logged in to add an account.");
      return;
    }
    if (!newAccountName.trim()) {
      showError("Account name cannot be empty.");
      return;
    }
    const initialBalance = parseFloat(newAccountInitialBalance);
    if (isNaN(initialBalance) || initialBalance < 0) {
      showError("Initial balance must be a non-negative number.");
      return;
    }

    const { data: newAccount, error: accountError } = await supabase
      .from('financial_accounts')
      .insert({
        profile_id: currentUser.id,
        name: newAccountName.trim(),
        initial_balance: initialBalance,
        current_balance: initialBalance, // Current balance starts as initial balance
      })
      .select()
      .single();

    if (accountError) {
      console.error("Error adding account:", accountError);
      showError("Failed to add financial account.");
      return;
    }

    // Also create an income transaction for the initial balance
    const { error: incomeTxError } = await supabase
      .from('income_transactions')
      .insert({
        profile_id: currentUser.id,
        account_id: newAccount.id,
        amount: initialBalance,
        source: "Initial Account Balance",
        date: new Date().toISOString(),
      });

    if (incomeTxError) {
      console.error("Error adding initial balance income transaction:", incomeTxError);
      showError("Financial account added, but failed to record initial balance as income.");
    } else {
      showSuccess("Financial account added and initial balance recorded successfully!");
    }
    
    setNewAccountName("");
    setNewAccountInitialBalance("0");
    fetchAccounts();
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !currentUser) {
      showError("No account selected for editing or user not logged in.");
      return;
    }
    if (!editAccountName.trim()) {
      showError("Account name cannot be empty.");
      return;
    }
    const initialBalance = parseFloat(editAccountInitialBalance);
    if (isNaN(initialBalance) || initialBalance < 0) {
      showError("Initial balance must be a non-negative number.");
      return;
    }

    // Update account details, including current_balance to match the new initial_balance
    const { error: accountUpdateError } = await supabase
      .from('financial_accounts')
      .update({
        name: editAccountName.trim(),
        initial_balance: initialBalance,
        current_balance: initialBalance, // Update current balance to reflect new initial balance
      })
      .eq('id', editingAccount.id)
      .eq('profile_id', currentUser.id); // Ensure user owns the account

    if (accountUpdateError) {
      console.error("Error updating account:", accountUpdateError);
      showError("Failed to update financial account.");
      return;
    }

    // Update or create the corresponding "Initial Account Balance" income transaction
    const { data: existingIncomeTx, error: fetchTxError } = await supabase
      .from('income_transactions')
      .select('id')
      .eq('account_id', editingAccount.id)
      .eq('profile_id', currentUser.id)
      .eq('source', 'Initial Account Balance')
      .single();

    if (fetchTxError && fetchTxError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error checking for existing initial balance transaction:", fetchTxError);
      showError("Account updated, but failed to verify initial balance income transaction.");
    } else if (existingIncomeTx) {
      // Update existing transaction
      const { error: updateTxError } = await supabase
        .from('income_transactions')
        .update({ amount: initialBalance })
        .eq('id', existingIncomeTx.id);
      if (updateTxError) {
        console.error("Error updating initial balance income transaction:", updateTxError);
        showError("Account updated, but failed to update initial balance income transaction.");
      } else {
        showSuccess("Financial account and initial balance income updated successfully!");
      }
    } else {
      // Create new transaction if not found
      const { error: createTxError } = await supabase
        .from('income_transactions')
        .insert({
          profile_id: currentUser.id,
          account_id: editingAccount.id,
          amount: initialBalance,
          source: "Initial Account Balance",
          date: new Date().toISOString(),
        });
      if (createTxError) {
        console.error("Error creating initial balance income transaction:", createTxError);
        showError("Account updated, but failed to create initial balance income transaction.");
      } else {
        showSuccess("Financial account updated and initial balance income created successfully!");
      }
    }

    setEditingAccount(null);
    fetchAccounts();
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId || !currentUser) {
      showError("No account selected for deletion or user not logged in.");
      return;
    }

    // First, delete associated "Initial Account Balance" income transaction
    const { error: deleteIncomeTxError } = await supabase
      .from('income_transactions')
      .delete()
      .eq('account_id', deletingAccountId)
      .eq('profile_id', currentUser.id)
      .eq('source', 'Initial Account Balance');

    if (deleteIncomeTxError) {
      console.error("Error deleting initial balance income transaction:", deleteIncomeTxError);
      showError("Failed to delete associated initial balance income transaction.");
      return;
    }

    // Then, delete the financial account
    const { error: deleteAccountError } = await supabase
      .from('financial_accounts')
      .delete()
      .eq('id', deletingAccountId)
      .eq('profile_id', currentUser.id); // Ensure user owns the account

    if (deleteAccountError) {
      console.error("Error deleting account:", deleteAccountError);
      showError("Failed to delete financial account.");
    } else {
      showSuccess("Financial account and associated initial balance income deleted successfully!");
      setDeletingAccountId(null);
      fetchAccounts();
    }
  };

  const openEditDialog = (account: FinancialAccount) => {
    setEditingAccount(account);
    setEditAccountName(account.name);
    setEditAccountInitialBalance(account.initial_balance.toString());
  };

  const openDeleteDialog = (accountId: string) => {
    setDeletingAccountId(accountId);
  };

  if (loading) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Financial Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading financial accounts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Financial Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Financial Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          Manage the financial accounts used for tracking income, expenditure, and petty cash.
        </p>

        {/* Add New Account Section */}
        <div className="border p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Account
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="new-account-name">Account Name</Label>
              <Input
                id="new-account-name"
                placeholder="e.g., Main Bank Account, Petty Cash"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                disabled={!canManageFinancialAccounts}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-account-balance">Initial Balance</Label>
              <Input
                id="new-account-balance"
                type="number"
                step="0.01"
                placeholder={`${currency.symbol}0.00`}
                value={newAccountInitialBalance}
                onChange={(e) => setNewAccountInitialBalance(e.target.value)}
                disabled={!canManageFinancialAccounts}
              />
            </div>
          </div>
          <Button onClick={handleAddAccount} className="w-full" disabled={!canManageFinancialAccounts || !newAccountName.trim()}>
            Add Account
          </Button>
        </div>

        {/* Existing Accounts Table */}
        <h3 className="text-lg font-semibold">Existing Accounts</h3>
        {accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-4 text-left text-sm font-medium text-muted-foreground">Account Name</TableHead>
                  <TableHead className="py-2 px-4 text-right text-sm font-medium text-muted-foreground">Initial Balance</TableHead>
                  <TableHead className="py-2 px-4 text-right text-sm font-medium text-muted-foreground">Current Balance</TableHead>
                  {canManageFinancialAccounts && <TableHead className="py-2 px-4 text-center text-sm font-medium text-muted-foreground w-[120px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <TableCell className="py-2 px-4 font-medium">{account.name}</TableCell>
                    <TableCell className="py-2 px-4 text-right">{currency.symbol}{account.initial_balance.toFixed(2)}</TableCell>
                    <TableCell className="py-2 px-4 text-right">{currency.symbol}{account.current_balance.toFixed(2)}</TableCell>
                    {canManageFinancialAccounts && (
                      <TableCell className="py-2 px-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(account)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(account.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center mt-4">No financial accounts found. Add one above!</p>
        )}
      </CardContent>

      {/* Edit Account Dialog */}
      <AlertDialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Financial Account</AlertDialogTitle>
            <AlertDialogDescription>
              Make changes to the account details. Note: Changing initial balance will not automatically adjust current balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-account-name">Account Name</Label>
              <Input
                id="edit-account-name"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                disabled={!canManageFinancialAccounts}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-account-initial-balance">Initial Balance</Label>
              <Input
                id="edit-account-initial-balance"
                type="number"
                step="0.01"
                value={editAccountInitialBalance}
                onChange={(e) => setEditAccountInitialBalance(e.target.value)}
                disabled={!canManageFinancialAccounts}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-account-current-balance">Current Balance</Label>
              <Input id="edit-account-current-balance" value={`${currency.symbol}${editingAccount?.current_balance.toFixed(2) || "0.00"}`} disabled />
              <p className="text-sm text-muted-foreground">Current balance is updated by transactions, not directly editable here.</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditAccount} disabled={!canManageFinancialAccounts || !editAccountName.trim()}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the financial account and all associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={!canManageFinancialAccounts}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FinancialAccountsSettings;