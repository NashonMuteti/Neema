"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import {
  Transaction,
  IncomeTxRow,
  ExpenditureTxRow,
  JoinedFinancialAccount // Use JoinedFinancialAccount for the nested object
} from "@/types/common"; // Updated import path
import { perfStart } from "@/utils/perf";

export const useRecentTransactions = (limit: number = 5) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const queryKey = ['recentTransactions', currentUser?.id, isAdmin, limit];

  const fetcher = async (): Promise<Transaction[]> => {
    const endAll = perfStart("useRecentTransactions:fetcher");

    if (!currentUser) {
      endAll({ skipped: true, reason: "no-currentUser" });
      return [];
    }

    try {
      const allFetchedTransactions: Transaction[] = [];

      // Fetch Income Transactions
      let incomeQuery = supabase
        .from('income_transactions')
        .select('id, date, amount, source, financial_accounts(id, name)')
        .order('date', { ascending: false })
        .limit(limit);
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }

      const endIncome = perfStart("useRecentTransactions:income_transactions");
      const { data: incomeData, error: incomeError } = await incomeQuery as { data: IncomeTxRow[] | null, error: any };
      endIncome({ rows: incomeData?.length ?? 0, errorCode: incomeError?.code });
      if (incomeError) console.error("Error fetching recent income:", incomeError);
      incomeData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'income',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.source,
        accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || 'Unknown Account',
        accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined, // Added accountId
      }));

      // Fetch Expenditure Transactions (now includes former petty cash)
      let expenditureQuery = supabase
        .from('expenditure_transactions')
        .select('id, date, amount, purpose, financial_accounts(id, name)')
        .order('date', { ascending: false })
        .limit(limit);
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }

      const endExp = perfStart("useRecentTransactions:expenditure_transactions");
      const { data: expenditureData, error: expenditureError } = await expenditureQuery as { data: ExpenditureTxRow[] | null, error: any };
      endExp({ rows: expenditureData?.length ?? 0, errorCode: expenditureError?.code });
      if (expenditureError) console.error("Error fetching recent expenditure:", expenditureError);
      expenditureData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'expenditure',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.purpose,
        accountOrProjectName: (tx.financial_accounts as JoinedFinancialAccount)?.name || 'Unknown Account',
        accountId: (tx.financial_accounts as JoinedFinancialAccount)?.id || undefined, // Added accountId
      }));

      const sortedAndLimited = allFetchedTransactions
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit);

      endAll({ ok: true, rows: sortedAndLimited.length });
      return sortedAndLimited;

    } catch (err: any) {
      console.error("Error fetching recent transactions:", err);
      showError("Failed to load recent transactions.");
      endAll({ ok: false });
      throw err;
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: fetcher,
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 1, // 1 minute stale time for recent transactions
    refetchOnWindowFocus: true,
  });

  return {
    recentTransactions: data || [],
    loadingRecentTransactions: isLoading,
    recentTransactionsError: error ? error.message : null,
  };
};