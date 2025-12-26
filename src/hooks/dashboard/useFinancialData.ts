"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getYear, format, parseISO } from "date-fns";
import { showError } from "@/utils/toast";

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

  const [monthlyFinancialData, setMonthlyFinancialData] = useState<MonthlyFinancialData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [financialsError, setFinancialsError] = useState<string | null>(null);

  const fetchFinancialData = useCallback(async () => {
    setLoadingFinancials(true);
    setFinancialsError(null);

    if (!currentUser) {
      setLoadingFinancials(false);
      return;
    }

    try {
      let incomeQuery = supabase.from('income_transactions').select('date, amount, source');
      if (!isAdmin) {
        incomeQuery = incomeQuery.eq('profile_id', currentUser.id);
      }
      // Exclude income from transfers AND initial account balances
      incomeQuery = incomeQuery.not('source', 'ilike', `Funds Transfer from %`);
      incomeQuery = incomeQuery.neq('source', 'Initial Account Balance');

      const { data: incomeTransactions, error: incomeError } = await incomeQuery;

      let expenditureQuery = supabase.from('expenditure_transactions').select('date, amount, purpose');
      if (!isAdmin) {
        expenditureQuery = expenditureQuery.eq('profile_id', currentUser.id);
      }
      // Exclude expenditure from transfers
      expenditureQuery = expenditureQuery.not('purpose', 'ilike', `Funds Transfer to %`);

      const { data: expenditureTransactions, error: expenditureError } = await expenditureQuery;

      let projectCollectionsQuery = supabase.from('project_collections').select('date, amount');
      if (!isAdmin) {
        projectCollectionsQuery = projectCollectionsQuery.eq('member_id', currentUser.id);
      }
      const { data: projectCollections, error: collectionsError } = await projectCollectionsQuery;

      let projectPledgesQuery = supabase.from('project_pledges').select('due_date, amount, status');
      if (!isAdmin) {
        projectPledgesQuery = projectPledgesQuery.eq('member_id', currentUser.id);
      }
      const { data: projectPledges, error: pledgesError } = await projectPledgesQuery;

      if (incomeError || expenditureError || collectionsError || pledgesError) {
        console.error("Error fetching financial data:", incomeError || expenditureError || collectionsError || pledgesError);
        setFinancialsError("Failed to load financial data.");
        setMonthlyFinancialData([]);
        setAvailableYears([]);
        return;
      }

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
      projectCollections?.forEach(collection => aggregateByMonth(collection.date, 'income', collection.amount));
      projectPledges?.forEach(pledge => {
        if (pledge.status === 'Paid') {
          aggregateByMonth(pledge.due_date, 'income', pledge.amount);
        } else if (pledge.status === 'Active') {
          aggregateByMonth(pledge.due_date, 'outstandingPledges', pledge.amount);
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

      setMonthlyFinancialData(sortedData);
      
      const currentYear = getYear(new Date());
      const yearsArray = Array.from({ length: 10 }, (_, i) => currentYear - i).sort((a, b) => b - a);
      setAvailableYears(yearsArray);

    } catch (err) {
      console.error("Unexpected error in fetchFinancialData:", err);
      setFinancialsError("An unexpected error occurred while loading financial data.");
    } finally {
      setLoadingFinancials(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchFinancialData();
    }
  }, [currentUser, fetchFinancialData]);

  return { monthlyFinancialData, availableYears, loadingFinancials, financialsError };
};