"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  getMonth,
  getYear,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { FinancialAccount, DebtRow } from "@/types/common";
import { Debt } from "@/components/sales-management/AddEditDebtDialog"; // Import Debt interface
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { perfStart } from "@/utils/perf";

interface ProjectCollection {
  id: string;
  date: string; // ISO string
  amount: number;
  project_id: string;
  member_id: string;
  account_id: string; // This is the key for grouping
}

interface UseTableBankingDataProps {
  filterPeriod: "daily" | "weekly" | "monthly" | "yearly";
  selectedDate?: Date;
  selectedMonth: string;
  selectedYear: string;
}

export const useTableBankingData = ({
  filterPeriod,
  selectedDate,
  selectedMonth,
  selectedYear,
}: UseTableBankingDataProps) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [allCollections, setAllCollections] = useState<ProjectCollection[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  })), []);

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  })), [currentYear]);

  const getPeriodInterval = useCallback(() => {
    let start: Date;
    let end: Date;

    switch (filterPeriod) {
      case "daily":
        start = startOfDay(selectedDate || new Date());
        end = endOfDay(selectedDate || new Date());
        break;
      case "weekly":
        start = startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 }); // Week starts on Monday
        end = endOfWeek(selectedDate || new Date(), { weekStartsOn: 1 });
        break;
      case "monthly":
        const monthDate = new Date(parseInt(selectedYear || currentYear.toString()), parseInt(selectedMonth || currentMonth.toString()));
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        break;
      case "yearly":
        const yearDate = new Date(parseInt(selectedYear || currentYear.toString()), 0);
        start = startOfYear(yearDate);
        end = endOfYear(yearDate);
        break;
    }
    return { start, end };
  }, [filterPeriod, selectedDate, selectedMonth, selectedYear, currentYear, currentMonth]);

  const { start, end } = useMemo(() => getPeriodInterval(), [getPeriodInterval]);

  const fetchTableBankingData = useCallback(async () => {
    const endAll = perfStart("useTableBankingData:fetchTableBankingData");
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      endAll({ skipped: true, reason: "no-currentUser" });
      return;
    }

    try {
      const endAccounts = perfStart("useTableBankingData:financial_accounts");
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance, initial_balance, profile_id')
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });
      endAccounts({ rows: accountsData?.length ?? 0, errorCode: accountsError?.code });

      if (accountsError) throw accountsError;
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);

      const endCollections = perfStart("useTableBankingData:project_collections");
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('project_collections')
        .select('id, date, amount, project_id, member_id, account_id')
        .order('date', { ascending: false });
      endCollections({ rows: collectionsData?.length ?? 0, errorCode: collectionsError?.code });

      if (collectionsError) throw collectionsError;
      setAllCollections(collectionsData || []);

      let debtsQuery = supabase
        .from('debts')
        .select(`
          id,
          description,
          original_amount,
          amount_due,
          due_date,
          status,
          created_by_profile_id,
          debtor_profile_id,
          customer_name,
          notes,
          created_at,
          created_by_profile:profiles!debts_created_by_profile_id_fkey(name, email),
          debtor_profile:profiles!debts_debtor_profile_id_fkey(name, email)
        `);

      if (!isAdmin) {
        debtsQuery = debtsQuery.or(`created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`);
      }

      const endDebts = perfStart("useTableBankingData:debts");
      const { data: debtsData, error: debtsError } = await debtsQuery.order('due_date', { ascending: false, nullsFirst: false });
      endDebts({ rows: debtsData?.length ?? 0, errorCode: debtsError?.code });

      if (debtsError) throw debtsError;
      setDebts((debtsData || []).map((d: any) => ({
        id: d.id,
        created_by_profile_id: d.created_by_profile_id,
        sale_id: d.sale_id || undefined,
        debtor_profile_id: d.debtor_profile_id || undefined,
        customer_name: d.customer_name || undefined,
        description: d.description,
        original_amount: d.original_amount,
        amount_due: d.amount_due,
        due_date: d.due_date ? parseISO(d.due_date) : undefined,
        status: d.status,
        notes: d.notes || undefined,
        created_at: parseISO(d.created_at || new Date().toISOString()),
        created_by_name: d.created_by_profile?.name || d.created_by_profile?.email || 'N/A',
        debtor_name: d.debtor_profile?.name || d.debtor_profile?.email || d.customer_name || 'N/A',
        sale_description: d.sales_transactions?.notes || undefined, // Assuming sales_transactions is joined elsewhere if needed
      })));

      endAll({ ok: true });
    } catch (err: any) {
      console.error("Error fetching table banking data:", err);
      setError(`Failed to load data: ${err.message || err.toString()}`);
      endAll({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, getPeriodInterval]);

  useEffect(() => {
    fetchTableBankingData();
  }, [fetchTableBankingData]);

  const filteredCollections = useMemo(() => {
    return allCollections.filter(collection => {
      const collectionDate = parseISO(collection.date);
      return isWithinInterval(collectionDate, { start, end });
    });
  }, [allCollections, start, end]);

  const groupedContributions = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredCollections.forEach(collection => {
      groups[collection.account_id] = (groups[collection.account_id] || 0) + collection.amount;
    });
    return groups;
  }, [filteredCollections]);

  const grandTotal = useMemo(() => Object.values(groupedContributions).reduce((sum, amount) => sum + amount, 0), [groupedContributions]);

  const filteredDebts = useMemo(() => {
    return debts.filter(debt => {
      const debtDate = debt.due_date || debt.created_at;
      if (!debtDate) return false;
      return isWithinInterval(debtDate, { start, end });
    });
  }, [debts, start, end]);

  const totalOutstandingDebts = useMemo(() => filteredDebts.reduce((sum, debt) => sum + debt.amount_due, 0), [filteredDebts]);

  const getPeriodLabel = useCallback(() => {
    switch (filterPeriod) {
      case "daily":
        return selectedDate ? format(selectedDate, "PPP") : "Select a date";
      case "weekly":
        return selectedDate ? `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}` : "Select a date";
      case "monthly":
        return `${months[parseInt(selectedMonth)].label} ${selectedYear}`;
      case "yearly":
        return selectedYear;
      default:
        return "";
    }
  }, [filterPeriod, selectedDate, start, end, selectedMonth, selectedYear, months]);

  return {
    financialAccounts,
    allCollections,
    debts,
    loading,
    error,
    filteredCollections,
    groupedContributions,
    grandTotal,
    filteredDebts,
    totalOutstandingDebts,
    getPeriodLabel,
    months,
    years,
  };
};