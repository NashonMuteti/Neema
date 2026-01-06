"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import MyContributionsTable from "@/components/my-contributions/MyContributionsTable"; // Renamed import
import MyContributionsGrandSummary from "@/components/my-contributions/MyContributionsGrandSummary"; // New import
import { MyContribution, MyFinancialAccount, JoinedProject } from "@/types/common"; // Import types from common.ts

// Define the expected structure of a collection row with joined project data
interface CollectionRowWithProject {
  id: string;
  project_id: string;
  amount: number;
  date: string;
  projects: JoinedProject | null;
}

// Define the expected structure of a pledge row with joined project data
interface PledgeRowWithProject {
  id: string;
  project_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: JoinedProject | null;
}

interface MyContributionsSummary {
  totalCollections: number;
  totalPledged: number;
  totalPaidPledges: number;
  totalOutstandingDebt: number;
}

const MyContributions = () => {
  const { currentUser } = useAuth();
  const [contributions, setContributions] = useState<MyContribution[]>([]);
  const [summaryData, setSummaryData] = useState<MyContributionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyContributionsAndSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // --- Fetch Collections ---
      const { data: collectionsData, error: collectionsError } = (await supabase
        .from('project_collections')
        .select(`
          id,
          project_id,
          amount,
          date,
          projects ( name, member_contribution_amount )
        `)
        .eq('member_id', currentUser.id)
        .order('date', { ascending: false })) as { data: CollectionRowWithProject[] | null, error: PostgrestError | null };

      if (collectionsError) throw collectionsError;

      const fetchedCollections: MyContribution[] = (collectionsData || []).map(c => {
        const expectedAmount = c.projects?.member_contribution_amount || 0;
        return {
          id: c.id,
          project_id: c.project_id,
          project_name: c.projects?.name || 'Unknown Project',
          amount: c.amount,
          date: parseISO(c.date),
          type: "Collection",
          expected_amount: expectedAmount,
          balance_amount: expectedAmount - c.amount, // Expected - Actual collected
        };
      });

      // --- Fetch Pledges ---
      const { data: pledgesData, error: pledgesError } = (await supabase
        .from('project_pledges')
        .select(`
          id,
          project_id,
          amount,
          paid_amount,
          due_date,
          status,
          comments,
          projects ( name, member_contribution_amount )
        `)
        .eq('member_id', currentUser.id)
        .order('due_date', { ascending: false })) as { data: PledgeRowWithProject[] | null, error: PostgrestError | null };

      if (pledgesError) throw pledgesError;

      const fetchedPledges: MyContribution[] = (pledgesData || []).map(p => {
        const originalAmount = p.amount;
        const paidAmount = p.paid_amount;
        return {
          id: p.id,
          project_id: p.project_id,
          project_name: p.projects?.name || 'Unknown Project',
          amount: originalAmount, // This is the original pledged amount
          original_amount: originalAmount, // Store original amount explicitly
          paid_amount: paidAmount, // Store paid amount
          date: parseISO(p.due_date), // Use due_date as primary date for sorting/display
          due_date: parseISO(p.due_date),
          type: "Pledge",
          status: paidAmount >= originalAmount ? "Paid" : "Active", // Derive status based on paid_amount
          expected_amount: p.projects?.member_contribution_amount || 0, // Include expected amount
          balance_amount: originalAmount - paidAmount, // Original - Paid
        };
      });

      setContributions([...fetchedCollections, ...fetchedPledges]);

      // --- Fetch Summary Data ---
      // Total Collections
      const { data: totalCollectionsData, error: totalCollectionsError } = await supabase
        .from('project_collections')
        .select('amount')
        .eq('member_id', currentUser.id);
      if (totalCollectionsError) throw totalCollectionsError;
      const totalCollections = (totalCollectionsData || []).reduce((sum, c) => sum + c.amount, 0);

      // Total Pledged and Total Paid Towards Pledges
      const { data: totalPledgesData, error: totalPledgesError } = await supabase
        .from('project_pledges')
        .select('amount, paid_amount')
        .eq('member_id', currentUser.id);
      if (totalPledgesError) throw totalPledgesError;
      const totalPledged = (totalPledgesData || []).reduce((sum, p) => sum + p.amount, 0);
      const totalPaidPledges = (totalPledgesData || []).reduce((sum, p) => sum + p.paid_amount, 0);

      // Total Outstanding Debt
      const { data: outstandingDebtsData, error: outstandingDebtsError } = await supabase
        .from('debts')
        .select('amount, paid_amount')
        .eq('profile_id', currentUser.id)
        .neq('status', 'Paid'); // Only unpaid/partially paid debts
      if (outstandingDebtsError) throw outstandingDebtsError;
      const totalOutstandingDebt = (outstandingDebtsData || []).reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);

      setSummaryData({
        totalCollections,
        totalPledged,
        totalPaidPledges,
        totalOutstandingDebt,
      });

    } catch (err: any) {
      console.error("Error fetching contributions or summary:", err);
      setError(err.message || "Failed to load contributions or summary.");
      showError(err.message || "Failed to load contributions or summary.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMyContributionsAndSummary();
    }
  }, [currentUser, fetchMyContributionsAndSummary]);

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
        <p className="text-lg text-muted-foreground">Please log in to view your contributions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View your personal financial contributions and pledges to various projects.
      </p>

      {/* Grand Summary */}
      {summaryData && (
        <MyContributionsGrandSummary
          totalCollections={summaryData.totalCollections}
          totalPledged={summaryData.totalPledged}
          totalPaidPledges={summaryData.totalPaidPledges}
          totalOutstandingDebt={summaryData.totalOutstandingDebt}
          loading={loading}
        />
      )}

      {/* Contributions Table */}
      <MyContributionsTable contributions={contributions} loading={loading} error={error} />
    </div>
  );
};

export default MyContributions;