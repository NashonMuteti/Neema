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
import { FinancialAccount } from "@/types/common";
import { Debt } from "@/components/sales-management/AddEditDebtDialog";
import { useAuth } from "@/context/AuthContext";
import { perfStart } from "@/utils/perf";
import { DateRange } from "react-day-picker";

export type AccountIncomeTxRow = {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  source: string;
  pledge_id: string | null;
};

export type AccountExpenditureTxRow = {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  purpose: string;
};

interface UseTableBankingDataProps {
  filterPeriod: "daily" | "weekly" | "monthly" | "yearly" | "range";
  selectedDate?: Date;
  selectedMonth: string;
  selectedYear: string;
  selectedRange?: DateRange;
}

export const useTableBankingData = ({
  filterPeriod,
  selectedDate,
  selectedMonth,
  selectedYear,
  selectedRange,
}: UseTableBankingDataProps) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomeTx, setIncomeTx] = useState<AccountIncomeTxRow[]>([]);
  const [expenditureTx, setExpenditureTx] = useState<AccountExpenditureTxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(0, i), "MMMM"),
      })),
    [],
  );

  const years = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        value: (currentYear - 2 + i).toString(),
        label: (currentYear - 2 + i).toString(),
      })),
    [currentYear],
  );

  const getPeriodInterval = useCallback(() => {
    let start: Date;
    let end: Date;

    switch (filterPeriod) {
      case "daily":
        start = startOfDay(selectedDate || new Date());
        end = endOfDay(selectedDate || new Date());
        break;
      case "weekly":
        start = startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 });
        end = endOfWeek(selectedDate || new Date(), { weekStartsOn: 1 });
        break;
      case "monthly": {
        const monthDate = new Date(
          parseInt(selectedYear || currentYear.toString()),
          parseInt(selectedMonth || currentMonth.toString()),
        );
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        break;
      }
      case "yearly": {
        const yearDate = new Date(parseInt(selectedYear || currentYear.toString()), 0);
        start = startOfYear(yearDate);
        end = endOfYear(yearDate);
        break;
      }
      case "range": {
        const from = selectedRange?.from
          ? startOfDay(selectedRange.from)
          : startOfDay(new Date());
        const to = selectedRange?.to ? endOfDay(selectedRange.to) : endOfDay(new Date());
        start = from;
        end = to;
        break;
      }
      default:
        start = startOfDay(new Date());
        end = endOfDay(new Date());
    }

    return { start, end };
  }, [
    filterPeriod,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedRange,
    currentYear,
    currentMonth,
  ]);

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
      // Financial accounts
      let accountsQuery = supabase
        .from("financial_accounts")
        .select("id, name, current_balance, initial_balance, profile_id")
        .order("name", { ascending: true });

      if (!isAdmin) {
        accountsQuery = accountsQuery.eq("profile_id", currentUser.id);
      }

      const endAccounts = perfStart("useTableBankingData:financial_accounts");
      const { data: accountsData, error: accountsError } = await accountsQuery;
      endAccounts({ rows: accountsData?.length ?? 0, errorCode: accountsError?.code });
      if (accountsError) throw accountsError;
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);

      // Debts
      let debtsQuery = supabase
        .from("debts")
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
        debtsQuery = debtsQuery.or(
          `created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`,
        );
      }

      const endDebts = perfStart("useTableBankingData:debts");
      const { data: debtsData, error: debtsError } = await debtsQuery
        .order("due_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      endDebts({ rows: debtsData?.length ?? 0, errorCode: debtsError?.code });
      if (debtsError) throw debtsError;
      setDebts(
        (debtsData || []).map((d: any) => ({
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
          created_by_name: d.created_by_profile?.name || d.created_by_profile?.email || "N/A",
          debtor_name:
            d.debtor_profile?.name ||
            d.debtor_profile?.email ||
            d.customer_name ||
            "N/A",
          sale_description: d.sales_transactions?.notes || undefined,
        })),
      );

      // Income/Expenditure for selected period
      let incomeQuery = supabase
        .from("income_transactions")
        .select("id, account_id, date, amount, source, pledge_id")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());

      if (!isAdmin) {
        incomeQuery = incomeQuery.eq("profile_id", currentUser.id);
      }

      const endIncome = perfStart("useTableBankingData:income_transactions");
      const { data: incomeData, error: incomeError } = await incomeQuery;
      endIncome({ rows: incomeData?.length ?? 0, errorCode: incomeError?.code });
      if (incomeError) throw incomeError;
      setIncomeTx((incomeData || []) as AccountIncomeTxRow[]);

      let expQuery = supabase
        .from("expenditure_transactions")
        .select("id, account_id, date, amount, purpose")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());

      if (!isAdmin) {
        expQuery = expQuery.eq("profile_id", currentUser.id);
      }

      const endExp = perfStart("useTableBankingData:expenditure_transactions");
      const { data: expData, error: expError } = await expQuery;
      endExp({ rows: expData?.length ?? 0, errorCode: expError?.code });
      if (expError) throw expError;
      setExpenditureTx((expData || []) as AccountExpenditureTxRow[]);

      endAll({ ok: true });
    } catch (err: any) {
      console.error("Error fetching table banking data:", err);
      setError(`Failed to load data: ${err.message || err.toString()}`);
      endAll({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, start, end]);

  useEffect(() => {
    fetchTableBankingData();
  }, [fetchTableBankingData]);

  // Contributions: treat them as income rows that look like project collections or pledge payments.
  const contributionIncomeTx = useMemo(() => {
    return incomeTx.filter((tx) => {
      const source = (tx.source || "").toLowerCase();
      return source.includes("project collection") || !!tx.pledge_id;
    });
  }, [incomeTx]);

  const groupedContributions = useMemo(() => {
    const groups: Record<string, number> = {};
    contributionIncomeTx.forEach((tx) => {
      groups[tx.account_id] = (groups[tx.account_id] || 0) + Number(tx.amount || 0);
    });
    return groups;
  }, [contributionIncomeTx]);

  const grandTotal = useMemo(
    () => Object.values(groupedContributions).reduce((sum, amount) => sum + amount, 0),
    [groupedContributions],
  );

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      const debtDate = debt.due_date || debt.created_at;
      if (!debtDate) return false;
      return isWithinInterval(debtDate, { start, end });
    });
  }, [debts, start, end]);

  const totalOutstandingDebts = useMemo(
    () => filteredDebts.reduce((sum, debt) => sum + debt.amount_due, 0),
    [filteredDebts],
  );

  const accountCashflow = useMemo(() => {
    const byAccount: Record<string, { income: number; expenditure: number; net: number }> = {};

    for (const tx of incomeTx) {
      byAccount[tx.account_id] = byAccount[tx.account_id] || {
        income: 0,
        expenditure: 0,
        net: 0,
      };
      byAccount[tx.account_id].income += Number(tx.amount || 0);
    }

    for (const tx of expenditureTx) {
      byAccount[tx.account_id] = byAccount[tx.account_id] || {
        income: 0,
        expenditure: 0,
        net: 0,
      };
      byAccount[tx.account_id].expenditure += Number(tx.amount || 0);
    }

    Object.keys(byAccount).forEach((id) => {
      byAccount[id].net = byAccount[id].income - byAccount[id].expenditure;
    });

    return byAccount;
  }, [incomeTx, expenditureTx]);

  const cashflowTotals = useMemo(() => {
    const income = Object.values(accountCashflow).reduce((sum, a) => sum + a.income, 0);
    const expenditure = Object.values(accountCashflow).reduce((sum, a) => sum + a.expenditure, 0);
    return { income, expenditure, net: income - expenditure };
  }, [accountCashflow]);

  const getPeriodLabel = useCallback(() => {
    switch (filterPeriod) {
      case "daily":
        return selectedDate ? format(selectedDate, "PPP") : "Select a date";
      case "weekly":
        return selectedDate
          ? `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`
          : "Select a date";
      case "monthly":
        return `${months[parseInt(selectedMonth)].label} ${selectedYear}`;
      case "yearly":
        return selectedYear;
      case "range":
        return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
      default:
        return "";
    }
  }, [filterPeriod, selectedDate, start, end, selectedMonth, selectedYear, months]);

  return {
    financialAccounts,
    loading,
    error,
    groupedContributions,
    contributionIncomeTx,
    grandTotal,
    filteredDebts,
    totalOutstandingDebts,
    getPeriodLabel,
    months,
    years,
    accountCashflow,
    cashflowTotals,
  };
};