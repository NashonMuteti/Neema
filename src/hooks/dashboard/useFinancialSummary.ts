"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";

interface FinancialAccountSummary {
  id: string;
  name: string;
  current_balance: number;
}

export const useFinancialSummary = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [totalUnpaidPledges, setTotalUnpaidPledges] = useState(0);
  const [activeFinancialAccounts, setActiveFinancialAccounts] = useState<FinancialAccountSummary[]>([]);
  const [grandTotalAccountsBalance, setGrandTotalAccountsBalance] = useState(0);
  const [cumulativeNetOperatingBalance, setCumulativeNetOperatingBalance] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchFinancialSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);

    if (!currentUser) {
      setLoadingSummary(false);
      return;
    }

    try {
      let unpaidPledgesQuery = supabase
        .from('project_pledges')
        .select('amount')
        .eq('status', 'Active');

      if (!isAdmin) {
        unpaidPledgesQuery = unpaidPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: unpaidPledgesData, error: unpaidPledgesError } = await unpaidPledgesQuery;

      if (unpaidPledgesError) {
        console.error("Error fetching unpaid pledges:", unpaidPledgesError);
        setSummaryError("Failed to load unpaid pledges.");
        setTotalUnpaidPledges(0);
      } else {
        const total = (unpaidPledgesData || []).reduce((sum, pledge) => sum + pledge.amount, 0);
        setTotalUnpaidPledges(total);
      }

      let accountsQuery = supabase
        .from('financial_accounts')
        .select('id, name, current_balance');
      
      if (!isAdmin) {
        accountsQuery = accountsQuery.eq('profile_id', currentUser.id);
      }
      const { data: accountsData, error: accountsError } = await accountsQuery;

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        setSummaryError("Failed to load financial accounts.");
        setActiveFinancialAccounts([]);
        setGrandTotalAccountsBalance(0);
      } else {
        setActiveFinancialAccounts(accountsData || []);
        const grandTotal = (accountsData || []).reduce((sum, account) => sum + account.current_balance, 0);
        setGrandTotalAccountsBalance(grandTotal);
      }

      let totalIncomeAllTime = 0;
      let totalExpenditureAllTime = 0;

      let incomeQuery = supabase.from('income_transactions').select('amount', 'source');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      // Exclude income from transfers
      incomeQuery = incomeQuery.neq('source', `Funds Transfer from %`);
      const { data: incomeTransactions, error: incomeError } = await incomeQuery;
      if (incomeError) throw incomeError;
      totalIncomeAllTime += (incomeTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      let projectCollectionsQuery = supabase.from('project_collections').select('amount');
      if (!isAdmin) {
        projectCollectionsQuery = projectCollectionsQuery.eq('member_id', currentUser.id);
      }
      const { data: projectCollections, error: collectionsError } = await projectCollectionsQuery;
      if (collectionsError) throw collectionsError;
      totalIncomeAllTime += (projectCollections || []).reduce((sum, c) => sum + c.amount, 0);

      let paidPledgesQuery = supabase.from('project_pledges').select('amount').eq('status', 'Paid');
      if (!isAdmin) {
        paidPledgesQuery = paidPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: paidPledges, error: paidPledgesError } = await paidPledgesQuery;
      if (paidPledgesError) throw paidPledgesError;
      totalIncomeAllTime += (paidPledges || []).reduce((sum, p) => sum + p.amount, 0);

      let expenditureQuery = supabase.from('expenditure_transactions').select('amount', 'purpose');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      // Exclude expenditure from transfers
      expenditureQuery = expenditureQuery.neq('purpose', `Funds Transfer to %`);
      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;
      if (expenditureError) throw expenditureError;
      totalExpenditureAllTime += (expenditureTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      let pettyCashQuery = supabase.from('petty_cash_transactions').select('amount');
      if (!isAdmin) {
        pettyCashQuery = pettyCashQuery.eq('profile_id', currentUser.id);
      }
      const { data: pettyCashTransactions, error: pettyCashError } = await pettyCashQuery;
      if (pettyCashError) throw pettyCashError;
      totalExpenditureAllTime += (pettyCashTransactions || []).reduce((sum, tx) => sum + tx.amount, 0);

      setCumulativeNetOperatingBalance(totalIncomeAllTime - totalExpenditureAllTime);

    } catch (err) {
      console.error("Unexpected error in fetchFinancialSummary:", err);
      setSummaryError("An unexpected error occurred while loading financial summary.");
    } finally {
      setLoadingSummary(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchFinancialSummary();
    }
  }, [currentUser, fetchFinancialSummary]);

  return {
    totalUnpaidPledges,
    activeFinancialAccounts,
    grandTotalAccountsBalance,
    cumulativeNetOperatingBalance,
    loadingSummary,
    summaryError,
  };
};