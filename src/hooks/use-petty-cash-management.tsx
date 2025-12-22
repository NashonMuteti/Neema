"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { validateFinancialTransaction } from "@/utils/security";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface PettyCashTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  purpose: string;
  user_id: string;
  account_name: string; // Added for display
}

export const usePettyCashManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const { canManagePettyCash } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePettyCash: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePettyCash = currentUserPrivileges.includes("Manage Petty Cash");
    return { canManagePettyCash };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAccount, setExpenseAccount] = useState<string | undefined>(undefined);
  const [expensePurpose, setExpensePurpose] = useState("");
  
  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState("");

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  })), []);

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  })), [currentYear]);

  const fetchFinancialAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance');
      
    if (error) {
      console.error("Error fetching financial accounts:", error);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(data || []);
      if (!expenseAccount && data && data.length > 0) {
        setExpenseAccount(data[0].id); // Set default account if none selected
      }
    }
  }, [expenseAccount]);

  const fetchPettyCashTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);
    
    let query = supabase
      .from('petty_cash_transactions')
      .select('*, financial_accounts(name)')
      .eq('user_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    if (searchQuery) {
      query = query.ilike('purpose', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching petty cash transactions:", error);
      setError("Failed to load petty cash transactions.");
      showError("Failed to load petty cash transactions.");
      setTransactions([]);
    } else {
      setTransactions(data.map(tx => ({
        id: tx.id,
        date: parseISO(tx.date),
        amount: tx.amount,
        account_id: tx.account_id,
        purpose: tx.purpose,
        user_id: tx.user_id,
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    fetchFinancialAccounts();
    fetchPettyCashTransactions();
  }, [fetchFinancialAccounts, fetchPettyCashTransactions]);

  const handlePostExpense = useCallback(async () => {
    if (!currentUser) {
      showError("You must be logged in to post petty cash expense.");
      return;
    }
    
    if (!expenseDate || !expenseAmount || !expenseAccount || !expensePurpose) {
      showError("All petty cash fields are required.");
      return;
    }
    
    const amount = parseFloat(expenseAmount);
    
    // Server-side validation
    const validation = validateFinancialTransaction(amount, expenseAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expense amount.");
      return;
    }
    
    const currentAccount = financialAccounts.find(acc => acc.id === expenseAccount);
    if (!currentAccount) {
      showError("Selected account not found.");
      return;
    }
    
    if (currentAccount.current_balance < amount) {
      showError("Insufficient balance in the selected account.");
      return;
    }
    
    const { error: insertError } = await supabase
      .from('petty_cash_transactions')
      .insert({
        date: expenseDate.toISOString(),
        amount,
        account_id: expenseAccount,
        purpose: expensePurpose,
        user_id: currentUser.id,
      });
      
    if (insertError) {
      console.error("Error posting petty cash expense:", insertError);
      showError("Failed to post petty cash expense.");
    } else {
      // Update account balance
      const newBalance = currentAccount.current_balance - amount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', expenseAccount);
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Petty cash expense posted, but failed to update account balance.");
      }
      
      showSuccess("Petty cash expense posted successfully!");
      fetchPettyCashTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
      
      // Reset form
      setExpenseDate(new Date());
      setExpenseAmount("");
      setExpenseAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setExpensePurpose("");
    }
  }, [currentUser, expenseDate, expenseAmount, expenseAccount, expensePurpose, financialAccounts, fetchPettyCashTransactions, fetchFinancialAccounts]);

  const handleEditTransaction = useCallback((id: string) => {
    // TODO: Implement an edit dialog for petty cash transactions to modify date, amount, purpose, etc.
    console.log("Editing petty cash transaction:", id);
    showError("Edit functionality is not yet implemented for petty cash transactions.");
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete petty cash expense.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('petty_cash_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id); // Ensure only owner can delete
      
    if (deleteError) {
      console.error("Error deleting petty cash transaction:", deleteError);
      showError("Failed to delete petty cash transaction.");
    } else {
      // Revert account balance
      const currentAccount = financialAccounts.find(acc => acc.id === accountId);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance + amount;
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId);
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Petty cash transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Petty cash transaction deleted successfully!");
      fetchPettyCashTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
    }
  }, [currentUser, financialAccounts, fetchPettyCashTransactions, fetchFinancialAccounts]);

  return {
    financialAccounts,
    transactions,
    loading,
    error,
    canManagePettyCash,
    expenseDate,
    setExpenseDate,
    expenseAmount,
    setExpenseAmount,
    expenseAccount,
    setExpenseAccount,
    expensePurpose,
    setExpensePurpose,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostExpense,
    handleEditTransaction,
    handleDeleteTransaction,
  };
};