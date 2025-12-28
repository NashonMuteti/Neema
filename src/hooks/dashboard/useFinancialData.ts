"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getYear, format, parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import { FinancialAccount, Member, MonthYearOption, Project, Transaction } from "@/types/common";

interface MonthlyFinancialData {
  year: number;
  month: string;
  income: number;
  expenditure: number;
  outstandingPledges: number;
}

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

      const aggregatedData: Record<string, { income: number; expenditure: number; outstandingPledges: number }> = {};
      const yearsSet = new Set<number>();

      const aggregateByMonth = (dateStr: string, type: 'income' | 'expenditure' | 'outstandingPledges', amount: number) => {
        const date = parseISO(dateStr);
        const year = getYear(date);
        const month = format(date, 'MMM');
        const key = `${year}-${month}`;
        
        if (!aggregatedData[key]) {
          aggregatedData[key] = { income: 0, expenditure: 0, outstandingPledges: 0 };
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

      const sortedData: MonthlyFinancialData[] = Object.keys(aggregatedData)
        .map(key => {
          const [yearStr, monthStr] = key.split('-');
          return {
            year: parseInt(yearStr),
            month: monthStr,
            income: aggregatedData[key].income,
            expenditure: aggregatedData[key].expenditure,
            outstandingPledges: aggregatedData[key].outstandingPledges,
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