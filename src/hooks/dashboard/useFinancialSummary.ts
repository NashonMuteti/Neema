"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { FinancialAccount } from "@/types/common";

interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

interface FinancialSummaryResult {
  totalUnpaidPledges: number;
  totalOutstandingDebts: number; // New: Total outstanding debts
  activeFinancialAccounts: FinancialAccountSummary[];
  grandTotalAccountsBalance: number;
  cumulativeNetOperatingBalance: number;
}

export const useFinancialSummary = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const queryKey = ['financialSummary', currentUser?.id, isAdmin];

  const fetcher = async (): Promise<FinancialSummaryResult> => {
    if (!currentUser) {
      return {
        totalUnpaidPledges: 0,
        totalOutstandingDebts: 0, // Default for new field
        activeFinancialAccounts: [],
        grandTotalAccountsBalance: 0,
        cumulativeNetOperatingBalance: 0,
      };
    }

    try {
      let unpaidPledgesQuery = supabase
        .from('project_pledges')
        .select('amount, paid_amount');
      if (!isAdmin) {
        unpaidPledgesQuery = unpaidPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: unpaidPledgesData, error: unpaidPledgesError } = await unpaidPledgesQuery;
      if (unpaidPledgesError) throw unpaidPledgesError;
      const totalUnpaidPledges = (unpaidPledgesData || []).reduce((sum, pledge) => sum + (pledge.amount - pledge.paid_amount), 0);

      // New: Fetch total outstanding debts
      let outstandingDebtsQuery = supabase
        .from('debts')
        .select('amount_due')
        .neq('status', 'Paid'); // Only count debts that are not fully paid
      if (!isAdmin) {
        // If not admin, only show debts created by or owed by the current user
        outstandingDebtsQuery = outstandingDebtsQuery.or(`created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`);
      }
      const { data: outstandingDebtsData, error: outstandingDebtsError } = await outstandingDebtsQuery;
      if (outstandingDebtsError) throw outstandingDebtsError;
      const totalOutstandingDebts = (outstandingDebtsData || []).reduce((sum, debt) => sum + debt.amount_due, 0);


      let accountsQuery = supabase
        .from('financial_accounts')
        .select('id, name, current_balance');
      if (!isAdmin) {
        accountsQuery = accountsQuery.eq('profile_id', currentUser.id);
      }
      const { data: accountsData, error: accountsError } = await accountsQuery;
      if (accountsError) throw accountsError;
      const activeFinancialAccounts = accountsData || [];
      const grandTotalAccountsBalance = (accountsData || []).reduce((sum, account) => sum + account.current_balance, 0);

      let totalIncomeAllTime = 0;
      let totalExpenditureAllTime = 0;

      let incomeQuery = supabase.from('income_transactions').select('amount,source');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      incomeQuery = incomeQuery.not('source', 'ilike', `Funds Transfer from %`);
      const { data: incomeTransactions, error: incomeError } = await incomeQuery;
      if (incomeError) throw incomeError;
      totalIncomeAllTime += (incomeTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      let expenditureQuery = supabase.from('expenditure_transactions').select('amount,purpose');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      expenditureQuery = expenditureQuery.not('purpose', 'ilike', `Funds Transfer to %`);
      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;
      if (expenditureError) throw expenditureError;
      totalExpenditureAllTime += (expenditureTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      // Removed petty cash transactions from here as they are now merged into expenditure_transactions

      const cumulativeNetOperatingBalance = totalIncomeAllTime - totalExpenditureAllTime;

      return {
        totalUnpaidPledges,
        totalOutstandingDebts, // Return new field
        activeFinancialAccounts,
        grandTotalAccountsBalance,
        cumulativeNetOperatingBalance,
      };
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      showError("Failed to load financial summary.");
      throw err;
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: fetcher,
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return {
    totalUnpaidPledges: data?.totalUnpaidPledges || 0,
    totalOutstandingDebts: data?.totalOutstandingDebts || 0, // Return new field
    activeFinancialAccounts: data?.activeFinancialAccounts || [],
    grandTotalAccountsBalance: data?.grandTotalAccountsBalance || 0,
    cumulativeNetOperatingBalance: data?.cumulativeNetOperatingBalance || 0,
    loadingSummary: isLoading,
    summaryError: error ? error.message : null,
  };
};