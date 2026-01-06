"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getYear, format, parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import { FinancialAccount, Member, MonthYearOption, Project, Transaction, MonthlyFinancialData, DebtRow } from "@/types/common";

export const useFinancialData = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const queryKey = ['financialData', currentUser?.id, isAdmin];

  const fetcher = async (): Promise<{ monthlyFinancialData: MonthlyFinancialData[]; availableYears: number[] }> => {
    if (!currentUser) {
      return { monthlyFinancialData: [], availableYears: [] };
    }

    try {
      // Fetch all income transactions, including initial balances, collections, and paid pledges
      let incomeQuery = supabase.from('income_transactions').select('date,amount,source');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      incomeQuery = incomeQuery.not('source', 'ilike', `Funds Transfer from %`);

      const { data: incomeTransactions, error: incomeError } = await incomeQuery;
      if (incomeError) throw incomeError;

      // Fetch expenditure transactions (now includes former petty cash)
      let expenditureQuery = supabase.from('expenditure_transactions').select('date,amount,purpose');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      expenditureQuery = expenditureQuery.not('purpose', 'ilike', `Funds Transfer to %`);

      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;
      if (expenditureError) throw expenditureError;

      let projectPledgesQuery = supabase.from('project_pledges').select('due_date, amount, paid_amount');
      if (!isAdmin) {
        projectPledgesQuery = projectPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: projectPledges, error: pledgesError } = await projectPledgesQuery;
      if (pledgesError) throw pledgesError;

      // New: Fetch debts
      let debtsQuery = supabase.from('debts').select('due_date, amount_due, status, created_at');
      if (!isAdmin) {
        debtsQuery = debtsQuery.or(`created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`);
      }
      const { data: debtsData, error: debtsError } = await debtsQuery as { data: DebtRow[] | null, error: any };
      if (debtsError) throw debtsError;

      const aggregatedData: Record<string, { income: number; expenditure: number; outstandingPledges: number; outstandingDebts: number }> = {};
      const yearsSet = new Set<number>();

      const aggregateByMonth = (dateStr: string | null, type: 'income' | 'expenditure' | 'outstandingPledges' | 'outstandingDebts', amount: number) => {
        if (!dateStr) return; // Skip if date is null
        const date = parseISO(dateStr);
        const year = getYear(date);
        const month = format(date, 'MMM');
        const key = `${year}-${month}`;
        
        if (!aggregatedData[key]) {
          aggregatedData[key] = { income: 0, expenditure: 0, outstandingPledges: 0, outstandingDebts: 0 };
        }
        aggregatedData[key][type] += amount;
        yearsSet.add(year);
      };

      incomeTransactions?.forEach(tx => aggregateByMonth(tx.date, 'income', tx.amount));
      expenditureTransactions?.forEach(tx => aggregateByMonth(tx.date, 'expenditure', tx.amount));
      
      projectPledges?.forEach(pledge => {
        const outstanding = pledge.amount - pledge.paid_amount;
        if (outstanding > 0) {
          aggregateByMonth(pledge.due_date, 'outstandingPledges', outstanding);
        }
      });

      // New: Aggregate outstanding debts
      debtsData?.forEach(debt => {
        if (debt.status !== 'Paid' && debt.amount_due > 0) {
          // Use due_date if available, otherwise created_at
          const dateToAggregate = debt.due_date || debt.created_at;
          aggregateByMonth(dateToAggregate, 'outstandingDebts', debt.amount_due);
        }
      });

      const sortedData: MonthlyFinancialData[] = Object.keys(aggregatedData)
        .map(key => {
          const [yearStr, monthStr] = key.split('-');
          return {
            year: parseInt(yearStr),
            month: monthStr,
            income: aggregatedData[key].income,
            expenditure: aggregatedData[key].expenditure,
            outstandingPledges: aggregatedData[key].outstandingPledges,
            outstandingDebts: aggregatedData[key].outstandingDebts, // Include new field
          };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
        });

      const currentYear = getYear(new Date());
      const yearsArray = Array.from({ length: 10 }, (_, i) => currentYear - i).sort((a, b) => b - a);

      return { monthlyFinancialData: sortedData, availableYears: yearsArray };

    } catch (err: any) {
      console.error("Error fetching financial data:", err);
      showError("Failed to load financial data.");
      throw err; // Re-throw to be caught by useQuery
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: fetcher,
    enabled: !!currentUser, // Only run query if currentUser is available
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
    refetchOnWindowFocus: true,
  });

  return {
    monthlyFinancialData: data?.monthlyFinancialData || [],
    availableYears: data?.availableYears || [],
    loadingFinancials: isLoading,
    financialsError: error ? error.message : null,
  };
};