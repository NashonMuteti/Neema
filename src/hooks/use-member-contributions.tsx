"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { canAccessMemberData, logSecurityEvent } from "@/utils/security";
import { showError } from "@/utils/toast";
import { 
  MemberContribution, 
  IncomeTxRow, 
  ExpenditureTxRow, 
  PettyCashTxRow 
} from "@/components/members/member-contributions/types";

interface UseMemberContributionsProps {
  userId: string | undefined;
  isDetailPage?: boolean; // To differentiate between MyContributions and MemberContributionsDetail
}

interface UseMemberContributionsResult {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  memberContributions: MemberContribution[];
  contributionsByDate: Record<string, MemberContribution[]>;
  totalIncome: number;
  totalExpenditure: number;
  netBalance: number;
  renderDay: (day: Date) => JSX.Element;
  memberName: string;
  loading: boolean;
  error: string | null;
  authorized: boolean | null;
}

export const useMemberContributions = ({ userId, isDetailPage = false }: UseMemberContributionsProps): UseMemberContributionsResult => {
  const { currentUser: loggedInUser, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState("");
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [memberName, setMemberName] = useState("Unknown Member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  })), []);

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  })), [currentYear]);

  const fetchContributionsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthorized(null);

    if (!userId || authLoading || !loggedInUser) {
      setLoading(false);
      return;
    }

    let isAuthorized = true;
    if (isDetailPage) {
      isAuthorized = await canAccessMemberData(loggedInUser.id, userId);
      setAuthorized(isAuthorized);
    } else {
      // For MyContributions, the user is always authorized to view their own data
      setAuthorized(true);
    }

    if (!isAuthorized) {
      logSecurityEvent('Unauthorized member data access attempt', {
        userId: loggedInUser.id,
        targetMemberId: userId,
        path: window.location.pathname
      });
      setError("You are not authorized to view this member's contributions.");
      setLoading(false);
      return;
    }

    // Fetch member name
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching member profile:", profileError);
      setError("Failed to load member profile.");
      setLoading(false);
      return;
    }

    if (profileData) {
      setMemberName(profileData.name || profileData.email || "Unknown Member");
    } else {
      setError("Member not found.");
      setLoading(false);
      return;
    }

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name)')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    const { data: expenditureData, error: expenditureError } = await supabase
      .from('expenditure_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: ExpenditureTxRow[] | null, error: PostgrestError | null };

    const { data: pettyCashData, error: pettyCashError } = await supabase
      .from('petty_cash_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: PettyCashTxRow[] | null, error: PostgrestError | null };

    if (incomeError || expenditureError || pettyCashError) {
      console.error("Error fetching contributions:", incomeError || expenditureError || pettyCashError);
      setError("Failed to load member's contributions.");
      setMemberContributions([]);
    } else {
      const allContributions: MemberContribution[] = [];
      
      incomeData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'income',
        sourceOrPurpose: tx.source,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));
      
      expenditureData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'expenditure',
        sourceOrPurpose: tx.purpose,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));
      
      pettyCashData?.forEach(tx => allContributions.push({
        id: tx.id,
        type: 'petty_cash',
        sourceOrPurpose: tx.purpose,
        date: parseISO(tx.date),
        amount: tx.amount,
        accountName: tx.financial_accounts?.name || 'Unknown Account'
      }));

      const filteredAndSorted = allContributions
        .filter(c => c.sourceOrPurpose.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
      
      setMemberContributions(filteredAndSorted);
    }
    
    setLoading(false);
  }, [userId, authLoading, loggedInUser, filterMonth, filterYear, searchQuery, isDetailPage]);

  useEffect(() => {
    if (!authLoading) {
      fetchContributionsData();
    }
  }, [authLoading, fetchContributionsData]);

  const totalIncome = useMemo(() => memberContributions.filter(c => c.type === 'income').reduce((sum, c) => sum + c.amount, 0), [memberContributions]);
  const totalExpenditure = useMemo(() => memberContributions.filter(c => c.type === 'expenditure' || c.type === 'petty_cash').reduce((sum, c) => sum + c.amount, 0), [memberContributions]);
  const netBalance = useMemo(() => totalIncome - totalExpenditure, [totalIncome, totalExpenditure]);

  const contributionsByDate = useMemo(() => memberContributions.reduce((acc, contribution) => {
    const dateKey = format(contribution.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, MemberContribution[]>), [memberContributions]);

  const renderDay = useCallback((day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = contributionsByDate[dateKey];
    
    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayContributions && dayContributions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <span className="h-1 w-1 rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  }, [contributionsByDate]);

  return {
    selectedDate,
    setSelectedDate,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    memberContributions,
    contributionsByDate,
    totalIncome,
    totalExpenditure,
    netBalance,
    renderDay,
    memberName,
    loading: loading || authLoading,
    error,
    authorized,
  };
};