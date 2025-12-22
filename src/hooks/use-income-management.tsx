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

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  user_id: string;
  account_name: string; // Added for display
}

export const useIncomeManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const { canManageIncome } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageIncome: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageIncome = currentUserPrivileges.includes("Manage Income");
    return { canManageIncome };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [incomeDate, setIncomeDate] = useState<Date | undefined>(new Date());
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeAccount, setIncomeAccount] = useState<string | undefined>(undefined);
  const [incomeSource, setIncomeSource] = useState("");
  
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
      if (!incomeAccount && data && data.length > 0) {
        setIncomeAccount(data[0].id); // Set default account if none selected
      }
    }
  }, [incomeAccount]);

  const fetchIncomeTransactions = useCallback(async () => {
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
      .eq('user_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
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
        user_id: tx.user_id,
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    fetchFinancialAccounts();
    fetchIncomeTransactions();
  }, [fetchFinancialAccounts, fetchIncomeTransactions]);

  const handlePostIncome = useCallback(async () => {
    if (!currentUser) {
      showError("You must be logged in to post income.");
      return;
    }
    
    if (!incomeDate || !incomeAmount || !incomeAccount || !incomeSource) {
      showError("All income fields are required.");
      return;
    }
    
    const amount = parseFloat(incomeAmount);
    
    // Client-side validation
    const validation = validateFinancialTransaction(amount, incomeAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }
    
    const { error: insertError } = await supabase
      .from('income_transactions')
      .insert({
        date: incomeDate.toISOString(),
        amount,
        account_id: incomeAccount,
        source: incomeSource,
        user_id: currentUser.id,
      });
      
    if (insertError) {
      console.error("Error posting income:", insertError);
      showError("Failed to post income.");
    } else {
      // Update account balance
      const currentAccount = financialAccounts.find(acc => acc.id === incomeAccount);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance + amount;
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', incomeAccount);
          
        if (updateBalanceError) {
          console.error("Error updating account balance:", updateBalanceError);
          showError("Income posted, but failed to update account balance.");
        }
      }
      
      showSuccess("Income posted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
      
      // Reset form
      setIncomeDate(new Date());
      setIncomeAmount("");
      setIncomeAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setIncomeSource("");
    }
  }, [currentUser, incomeDate, incomeAmount, incomeAccount, incomeSource, financialAccounts, fetchIncomeTransactions, fetchFinancialAccounts]);

  const handleEditTransaction = useCallback((id: string) => {
    // TODO: Implement an edit dialog for income transactions to modify date, amount, source, etc.
    console.log("Editing income transaction:", id);
    showError("Edit functionality is not yet implemented for income transactions.");
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete income.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('income_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id); // Ensure only owner can delete
      
    if (deleteError) {
      console.error("Error deleting income transaction:", deleteError);
      showError("Failed to delete income transaction.");
    } else {
      // Revert account balance
      const currentAccount = financialAccounts.find(acc => acc.id === accountId);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance - amount;
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId);
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Income transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Income transaction deleted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
    }
  }, [currentUser, financialAccounts, fetchIncomeTransactions, fetchFinancialAccounts]);

  return {
    financialAccounts,
    transactions,
    loading,
    error,
    canManageIncome,
    incomeDate,
    setIncomeDate,
    incomeAmount,
    setIncomeAmount,
    incomeAccount,
    setIncomeAccount,
    incomeSource,
    setIncomeSource,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostIncome,
    handleEditTransaction,
    handleDeleteTransaction,
  };
};