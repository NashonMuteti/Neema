"use client";
import React from "react";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { validateFinancialTransaction } from "@/utils/security";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable from "@/components/income/IncomeTable";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  profile_id: string; // Changed from user_id to profile_id
  account_name: string; // Joined from financial_accounts
}

interface MonthYearOption {
  value: string;
  label: string;
}

const Income = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  
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
      .select('id, name, current_balance');
      
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

    // Server-side validation
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
    
    // Determine the profile_id for the transaction
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
      // Update account balance
      const newBalance = currentAccount.current_balance + incomeAmount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', incomeAccount)
        .eq('profile_id', currentUser.id); // Ensure user owns the account
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Income posted, but failed to update account balance.");
      }
      
      showSuccess("Income posted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccountsAndMembers(); // Re-fetch accounts to update balances
    }
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing income transaction:", id);
    showError("Edit functionality is not yet implemented for income transactions.");
  };

  const handleDeleteTransaction = async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete income.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('income_transactions')
      .delete()
      .eq('id', id)
      .eq('profile_id', currentUser.id); // Ensure only owner can delete
      
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
          .eq('id', accountId)
          .eq('profile_id', currentUser.id); // Ensure user owns the account
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Income transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Income transaction deleted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccountsAndMembers(); // Re-fetch accounts to update balances
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeForm
          financialAccounts={financialAccounts}
          members={members}
          canManageIncome={canManageIncome}
          onPostIncome={handlePostIncome}
        />
        
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
  );
};

export default Income;