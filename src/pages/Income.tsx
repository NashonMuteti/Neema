"use client";
import React from "react";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { validateFinancialTransaction } from "@/utils/security";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { useQueryClient } from "@tanstack/react-query"; // New import

import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable from "@/components/income/IncomeTable";
import EditIncomeDialog from "@/components/income/EditIncomeDialog"; // New import
import DeleteIncomeDialog from "@/components/income/DeleteIncomeDialog"; // New import
import { FinancialAccount, Member, MonthYearOption } from "@/types/common"; // Unified imports

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  profile_id: string; // Changed from user_id to profile_id
  account_name: string; // Joined from financial_accounts
}

const Income = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient(); // Initialize queryClient
  
  const { canManageIncome } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageIncome: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageIncome = currentUserPrivileges.includes("Manage Income");
    return { canManageIncome };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]); // New state for members
  const [transactions, setTransactions] = React.useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // State for Edit/Delete Dialogs
  const [editingTransaction, setEditingTransaction] = React.useState<IncomeTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = React.useState<IncomeTransaction | null>(null);
  
  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months: MonthYearOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));

  const years: MonthYearOption[] = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchFinancialAccountsAndMembers = React.useCallback(async () => {
    let query = supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id'); // Select all fields for FinancialAccount type
      
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
    if (!isAdmin && currentUser) {
      query = query.eq('profile_id', currentUser.id); // Filter by profile_id for non-admins
    }
      
    const { data: accountsData, error: accountsError } = await query;
      
    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(accountsData || []);
    }

    // Fetch all members for the optional selector
    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members for income association.");
    } else {
      setMembers(membersData || []);
    }

  }, [currentUser]);

  const fetchIncomeTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);
    
    let query = supabase
      .from('income_transactions')
      .select('*, financial_accounts(name)')
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    // Conditionally apply profile_id filter based on admin status
    const isAdmin = currentUser.role === "Admin" || currentUser.role === "Super Admin";
    if (!isAdmin) {
      query = query.eq('profile_id', currentUser.id); // Use profile_id
    }
      
    if (searchQuery) {
      query = query.ilike('source', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching income transactions:", error);
      setError("Failed to load income transactions.");
      showError("Failed to load income transactions.");
      setTransactions([]);
    } else {
      setTransactions(data.map(tx => ({
        id: tx.id,
        date: parseISO(tx.date),
        amount: tx.amount,
        account_id: tx.account_id,
        source: tx.source,
        profile_id: tx.profile_id, // Use profile_id
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  React.useEffect(() => {
    fetchFinancialAccountsAndMembers();
    fetchIncomeTransactions();
  }, [fetchFinancialAccountsAndMembers, fetchIncomeTransactions]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] }); // In case project collections/pledges affect it
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] }); // In case project collections/pledges affect it
  };

  const handlePostIncome = async (formData: {
    incomeDate: Date;
    incomeAmount: number;
    incomeAccount: string;
    incomeSource: string;
    selectedIncomeMemberId?: string;
  }) => {
    if (!currentUser) {
      showError("You must be logged in to post income.");
      return;
    }
    
    const { incomeDate, incomeAmount, incomeAccount, incomeSource, selectedIncomeMemberId } = formData;

    const validation = validateFinancialTransaction(incomeAmount, incomeAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }
    
    const currentAccount = financialAccounts.find(acc => acc.id === incomeAccount);
    if (!currentAccount) {
      showError("Selected account not found.");
      return;
    }
    
    const transactionProfileId = selectedIncomeMemberId || currentUser.id;

    const { error: insertError } = await supabase
      .from('income_transactions')
      .insert({
        date: incomeDate.toISOString(),
        amount: incomeAmount,
        account_id: incomeAccount,
        source: incomeSource,
        profile_id: transactionProfileId, // Use the determined profile_id
      });
      
    if (insertError) {
      console.error("Error posting income:", insertError);
      showError("Failed to post income.");
    } else {
      const newBalance = currentAccount.current_balance + incomeAmount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', incomeAccount)
        .eq('profile_id', currentAccount.profile_id); // Use the account's profile_id
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Income posted, but failed to update account balance.");
      }
      
      showSuccess("Income posted successfully!");
      await fetchIncomeTransactions(); // Refresh transactions
      await fetchFinancialAccountsAndMembers(); // Re-fetch accounts to update balances
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleEditTransaction = (transaction: IncomeTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEditedTransaction = async (updatedTx: IncomeTransaction) => {
    if (!currentUser) {
      showError("You must be logged in to edit income.");
      return;
    }

    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) {
      showError("Original transaction not found.");
      return;
    }

    const parsedAmount = parseFloat(updatedTx.amount.toString());
    const validation = validateFinancialTransaction(parsedAmount, updatedTx.account_id, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }

    // Update the income transaction itself
    const { error: updateTxError } = await supabase
      .from('income_transactions')
      .update({
        date: updatedTx.date.toISOString(),
        amount: parsedAmount,
        account_id: updatedTx.account_id,
        source: updatedTx.source,
        profile_id: updatedTx.profile_id,
      })
      .eq('id', updatedTx.id)
      .eq('profile_id', oldTx.profile_id); // Use the transaction's original profile_id

    if (updateTxError) {
      console.error("Error updating income transaction:", updateTxError);
      showError("Failed to update income transaction.");
      return;
    }

    const oldAccount = financialAccounts.find(acc => acc.id === oldTx.account_id);
    const newAccount = financialAccounts.find(acc => acc.id === updatedTx.account_id);

    if (!oldAccount || !newAccount) {
      showError("One or more financial accounts not found for balance adjustment.");
      return;
    }

    if (oldTx.account_id === updatedTx.account_id) {
      // If account is the same, just adjust its balance
      const amountDifference = parsedAmount - oldTx.amount;
      const newBalance = oldAccount.current_balance + amountDifference;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', oldAccount.id)
        .eq('profile_id', oldAccount.profile_id); // Use the account's profile_id
      if (updateBalanceError) {
        console.error("Error updating account balance for same account:", updateBalanceError);
        showError("Transaction updated, but failed to adjust account balance.");
      }
    } else {
      // If account changed, debit old account and credit new account
      const oldAccountNewBalance = oldAccount.current_balance - oldTx.amount;
      const newAccountNewBalance = newAccount.current_balance + parsedAmount;

      const { error: updateOldAccountError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: oldAccountNewBalance })
        .eq('id', oldAccount.id)
        .eq('profile_id', oldAccount.profile_id); // Use the old account's profile_id

      const { error: updateNewAccountError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newAccountNewBalance })
        .eq('id', newAccount.id)
        .eq('profile_id', newAccount.profile_id); // Use the new account's profile_id

      if (updateOldAccountError || updateNewAccountError) {
        console.error("Error updating account balances for different accounts:", updateOldAccountError, updateNewAccountError);
        showError("Transaction updated, but failed to adjust account balances.");
      }
    }

    showSuccess("Income transaction updated successfully!");
    setEditingTransaction(null);
    await fetchIncomeTransactions(); // Refresh transactions
    await fetchFinancialAccountsAndMembers(); // Re-fetch accounts to update balances
    invalidateDashboardQueries(); // Invalidate dashboard queries
  };

  const handleDeleteTransaction = (transaction: IncomeTransaction) => {
    setDeletingTransaction(transaction);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction || !currentUser) {
      showError("No transaction selected for deletion or user not logged in.");
      return;
    }
    
    const { id, amount, account_id, profile_id } = deletingTransaction;

    // Delete the income transaction
    const { error: deleteError } = await supabase
      .from('income_transactions')
      .delete()
      .eq('id', id)
      .eq('profile_id', profile_id); // Use the transaction's profile_id
      
    if (deleteError) {
      console.error("Error deleting income transaction:", deleteError);
      showError("Failed to delete income transaction.");
    } else {
      // Revert account balance
      const currentAccount = financialAccounts.find(acc => acc.id === account_id);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance - amount; // Correctly debiting the account
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', account_id)
          .eq('profile_id', currentAccount.profile_id); // Use the account's profile_id
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Income transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Income transaction deleted successfully!");
      setDeletingTransaction(null);
      await fetchIncomeTransactions(); // Refresh transactions
      await fetchFinancialAccountsAndMembers(); // Re-fetch accounts to update balances
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Income</h1>
        <p className="text-lg text-muted-foreground">Loading income data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Income</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Income</h1>
      <p className="text-lg text-muted-foreground">
        Record and manage all financial inflows.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <IncomeForm
            financialAccounts={financialAccounts}
            members={members}
            canManageIncome={canManageIncome}
            onPostIncome={handlePostIncome}
          />
        </div>
        
        <div className="lg:col-span-2">
          <IncomeTable
            transactions={transactions}
            canManageIncome={canManageIncome}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            months={months}
            years={years}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
      </div>

      {editingTransaction && (
        <EditIncomeDialog
          isOpen={!!editingTransaction}
          setIsOpen={() => setEditingTransaction(null)}
          initialData={editingTransaction}
          onSave={handleSaveEditedTransaction}
          financialAccounts={financialAccounts}
          members={members}
          canManageIncome={canManageIncome}
          currency={currency}
        />
      )}

      {deletingTransaction && (
        <DeleteIncomeDialog
          isOpen={!!deletingTransaction}
          setIsOpen={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          onConfirm={handleConfirmDeleteTransaction}
          currency={currency}
        />
      )}
    </div>
  );
};

export default Income;