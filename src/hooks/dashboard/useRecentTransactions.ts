"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import {
  Transaction,
  IncomeTxRow,
  ExpenditureTxRow,
  PettyCashTxRow,
} from "@/components/my-contributions/types";

export const useRecentTransactions = (limit: number = 5) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingRecentTransactions, setLoadingRecentTransactions] = useState(true);
  const [recentTransactionsError, setRecentTransactionsError] = useState<string | null>(null);

  const fetchRecentTransactions = useCallback(async () => {
    setLoadingRecentTransactions(true);
    setRecentTransactionsError(null);

    if (!currentUser) {
      setLoadingRecentTransactions(false);
      return;
    }

    try {
      const allFetchedTransactions: Transaction[] = [];

      // Fetch Income Transactions
      let incomeQuery = supabase
        .from('income_transactions')
        .select('id, date, amount, source, financial_accounts(name)')
        .order('date', { ascending: false })
        .limit(limit);
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      const { data: incomeData, error: incomeError } = await incomeQuery as { data: IncomeTxRow[] | null, error: any };

      if (incomeError) console.error("Error fetching recent income:", incomeError);
      incomeData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'income',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.source,
        accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
      }));

      // Fetch Expenditure Transactions
      let expenditureQuery = supabase
        .from('expenditure_transactions')
        .select('id, date, amount, purpose, financial_accounts(name)')
        .order('date', { ascending: false })
        .limit(limit);
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      const { data: expenditureData, error: expenditureError } = await expenditureQuery as { data: ExpenditureTxRow[] | null, error: any };

      if (expenditureError) console.error("Error fetching recent expenditure:", expenditureError);
      expenditureData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'expenditure',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.purpose,
        accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
      }));

      // Fetch Petty Cash Transactions
      let pettyCashQuery = supabase
        .from('petty_cash_transactions')
        .select('id, date, amount, purpose, financial_accounts(name)')
        .order('date', { ascending: false })
        .limit(limit);
      if (!isAdmin) {
        pettyCashQuery = pettyCashQuery.eq('profile_id', currentUser.id);
      }
      const { data: pettyCashData, error: pettyCashError } = await pettyCashQuery as { data: PettyCashTxRow[] | null, error: any };

      if (pettyCashError) console.error("Error fetching recent petty cash:", pettyCashError);
      pettyCashData?.forEach(tx => allFetchedTransactions.push({
        id: tx.id,
        type: 'petty_cash',
        date: parseISO(tx.date),
        amount: tx.amount,
        description: tx.purpose,
        accountOrProjectName: tx.financial_accounts?.name || 'Unknown Account',
      }));

      // Sort all transactions by date (most recent first) and limit to the desired number
      const sortedAndLimited = allFetchedTransactions
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit);

      setRecentTransactions(sortedAndLimited);

    } catch (err) {
      console.error("Unexpected error in fetchRecentTransactions:", err);
      setRecentTransactionsError("An unexpected error occurred while loading recent transactions.");
      showError("Failed to load recent transactions.");
    } finally {
      setLoadingRecentTransactions(false);
    }
  }, [currentUser, isAdmin, limit]);

  useEffect(() => {
    if (currentUser) {
      fetchRecentTransactions();
    }
  }, [currentUser, fetchRecentTransactions]);

  return { recentTransactions, loadingRecentTransactions, recentTransactionsError };
};