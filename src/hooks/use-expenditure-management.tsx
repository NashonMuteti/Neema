"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext"; // Corrected import path
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

interface ExpenditureTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  purpose: string;
  user_id: string;
  account_name: string; // Added for display
}

export const useExpenditureManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const { canManageExpenditure } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageExpenditure: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageExpenditure = currentUserPrivileges.includes("Manage Expenditure");
    return { canManageExpenditure };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<ExpenditureTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [expenditureDate, setExpenditureDate] = useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = useState("");
  const [expenditureAccount, setExpenditureAccount] = useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = useState("");
  
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
      if (!expenditureAccount && data && data.length > 0) {
        setExpenditureAccount(data[0].id); // Set default account if none selected
      }
    }
  }, [expenditureAccount]);

  const fetchExpenditureTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);
    
    let query = supabase
      .from('expenditure_transactions')
      .select('*, financial_accounts(name)')
      .eq('user_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    if (searchQuery) {
      query = query.ilike('purpose', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching expenditure transactions:", error);
      setError("Failed to load expenditure transactions.");
      showError("Failed to load expenditure transactions.");
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
    fetchExpenditureTransactions();
  }, [fetchFinancialAccounts, fetchExpenditureTransactions]);

  const handlePostExpenditure = useCallback(async () => {
    if (!currentUser) {
      showError("You must be logged in to post expenditure.");
      return;
    }
    
    if (!expenditureDate || !expenditureAmount || !expenditureAccount || !expenditurePurpose) {
      showError("All expenditure fields are required.");
      return;
    }
    
    const amount = parseFloat(expenditureAmount);
    
    // Server-side validation
    const validation = validateFinancialTransaction(amount, expenditureAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expenditure amount.");
      return;
    }
    
    const currentAccount = financialAccounts.find(acc => acc.id === expenditureAccount);
    if (!currentAccount) {
      showError("Selected account not found.");
      return;
    }
    
    if (currentAccount.current_balance < amount) {
      showError("Insufficient balance in the selected account.");
      return;
    }
    
    const { error: insertError } = await supabase
      .from('expenditure_transactions')
      .insert({
        date: expenditureDate.toISOString(),
        amount,
        account_id: expenditureAccount,
        purpose: expenditurePurpose,
        user_id: currentUser.id,
      });
      
    if (insertError) {
      console.error("Error posting expenditure:", insertError);
      showError("Failed to post expenditure.");
    } else {
      // Update account balance
      const newBalance = currentAccount.current_balance - amount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', expenditureAccount);
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Expenditure posted, but failed to update account balance.");
      }
      
      showSuccess("Expenditure posted successfully!");
      fetchExpenditureTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
      
      // Reset form
      setExpenditureDate(new Date());
      setExpenditureAmount("");
      setExpenditureAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setExpenditurePurpose("");
    }
  }, [currentUser, expenditureDate, expenditureAmount, expenditureAccount, expenditurePurpose, financialAccounts, fetchExpenditureTransactions, fetchFinancialAccounts]);

  const handleEditTransaction = useCallback((id: string) => {
    // TODO: Implement an edit dialog for expenditure transactions to modify date, amount, purpose, etc.
    console.log("Editing expenditure transaction:", id);
    showError("Edit functionality is not yet implemented for expenditure transactions.");
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete expenditure.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('expenditure_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id); // Ensure only owner can delete
      
    if (deleteError) {
      console.error("Error deleting expenditure transaction:", deleteError);
      showError("Failed to delete expenditure transaction.");
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
          showError("Expenditure transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Expenditure transaction deleted successfully!");
      fetchExpenditureTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
    }
  }, [currentUser, financialAccounts, fetchExpenditureTransactions, fetchFinancialAccounts]);

  return {
    financialAccounts,
    transactions,
    loading,
    error,
    canManageExpenditure,
    expenditureDate,
    setExpenditureDate,
    expenditureAmount,
    setExpenditureAmount,
    expenditureAccount,
    setExpenditureAccount,
    expenditurePurpose,
    setExpenditurePurpose,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostExpenditure,
    handleEditTransaction,
    handleDeleteTransaction,
  };
};