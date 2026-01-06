"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import MyContributionsTable from "@/components/my-contributions/MyContributionsTable";
import MyContributionsBreakdownTable from "@/components/my-contributions/MyContributionsBreakdownTable"; // New import
import { MyContribution, JoinedProject, DebtRow, ContributionBreakdownItem } from "@/types/common"; // Import types from common.ts

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
  amount: number; // This is original_amount
  paid_amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: JoinedProject | null;
}

const MyContributions = () => {
  const { currentUser } = useAuth();
  const [contributions, setContributions] = useState<MyContribution[]>([]);
  const [totalContributed, setTotalContributed] = useState(0);
  const [balanceToPay, setBalanceToPay] = useState(0);
  const [breakdownItems, setBreakdownItems] = useState<ContributionBreakdownItem[]>([]); // New state for breakdown
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
      let allMyContributions: MyContribution[] = [];
      let currentTotalContributed = 0;
      let currentBalanceToPay = 0;
      let currentBreakdownItems: ContributionBreakdownItem[] = [];

      // --- Fetch Collections ---
      const { data: collectionsData, error: collectionsError } = (await supabase
        .from('project_collections')
        .select(`
          id,
          project_id,
          amount,
          date,
          projects ( name )
        `)
        .eq('member_id', currentUser.id)
        .order('date', { ascending: false })) as { data: CollectionRowWithProject[] | null, error: PostgrestError | null };

      if (collectionsError) throw collectionsError;

      const fetchedCollections: MyContribution[] = (collectionsData || []).map(c => {
        currentTotalContributed += c.amount; // Collections directly contribute to total
        return {
          id: c.id,
          project_id: c.project_id,
          project_name: c.projects?.name || 'Unknown Project',
          amount: c.amount, // Actual collected amount
          date: parseISO(c.date),
          type: "Collection",
          expected_amount: c.amount, // For collections, expected is actual collected
          balance_amount: 0, // Collections are fully paid, so balance is 0
        };
      });
      allMyContributions = [...allMyContributions, ...fetchedCollections];

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
          projects ( name )
        `)
        .eq('member_id', currentUser.id)
        .order('due_date', { ascending: false })) as { data: PledgeRowWithProject[] | null, error: PostgrestError | null };

      if (pledgesError) throw pledgesError;

      const fetchedPledges: MyContribution[] = (pledgesData || []).map(p => {
        const originalAmount = p.amount;
        const paidAmount = p.paid_amount;
        const balance = originalAmount - paidAmount;

        currentTotalContributed += paidAmount; // Paid portion of pledges contributes
        currentBalanceToPay += balance; // Unpaid portion of pledges contributes to balance to pay

        // Add to breakdown
        currentBreakdownItems.push({
          id: p.id,
          name: p.projects?.name || 'Unknown Project Pledge',
          type: "Pledge",
          expectedAmount: originalAmount,
          paidAmount: paidAmount,
          balanceDue: balance,
          status: paidAmount >= originalAmount ? "Paid" : "Active",
          dueDate: parseISO(p.due_date),
        });

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
          expected_amount: originalAmount, // Expected for pledges is the original amount
          balance_amount: balance, // Original - Paid
        };
      });
      allMyContributions = [...allMyContributions, ...fetchedPledges];

      // --- Fetch Debts ---
      let debtsQuery = supabase
        .from('debts')
        .select(`
          id,
          original_amount,
          amount_due,
          due_date,
          status,
          description,
          created_at
        `)
        .or(`created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`)
        .order('due_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }); // Fallback sort

      const { data: debtsData, error: debtsError } = (await debtsQuery) as { data: DebtRow[] | null, error: PostgrestError | null };

      if (debtsError) throw debtsError;

      const fetchedDebts: MyContribution[] = (debtsData || []).map(d => {
        const originalAmount = d.original_amount;
        const amountDue = d.amount_due;
        const paidAmount = originalAmount - amountDue;

        currentTotalContributed += paidAmount; // Paid portion of debts contributes
        currentBalanceToPay += amountDue; // Amount due for debts contributes to balance to pay

        // Add to breakdown
        currentBreakdownItems.push({
          id: d.id,
          name: d.description || 'Personal Debt',
          type: "Debt",
          expectedAmount: originalAmount,
          paidAmount: paidAmount,
          balanceDue: amountDue,
          status: d.status,
          dueDate: d.due_date ? parseISO(d.due_date) : undefined,
        });

        return {
          id: d.id,
          project_name: d.description || 'Personal Debt', // Use description as project_name for debts
          description: d.description,
          amount: originalAmount, // Original debt amount
          original_amount: originalAmount,
          paid_amount: paidAmount,
          date: d.due_date ? parseISO(d.due_date) : parseISO(d.created_at), // Use due_date or created_at
          due_date: d.due_date ? parseISO(d.due_date) : undefined,
          type: "Debt",
          status: d.status,
          expected_amount: originalAmount, // Expected for debts is the original amount
          balance_amount: amountDue, // Remaining amount due
        };
      });
      allMyContributions = [...allMyContributions, ...fetchedDebts];

      // --- Fetch Active Projects for Expected Contributions ---
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, member_contribution_amount')
        .eq('status', 'Open');

      if (projectsError) throw projectsError;

      // For each active project, calculate the user's expected contribution and how much they've paid
      for (const project of (projectsData || [])) {
        const expected = project.member_contribution_amount || 0;

        // Sum of collections for this project by the current user
        const projectCollections = fetchedCollections.filter(c => c.project_id === project.id);
        const totalCollectedForProject = projectCollections.reduce((sum, c) => sum + c.amount, 0);

        // Sum of paid pledges for this project by the current user
        const projectPledges = fetchedPledges.filter(p => p.project_id === project.id);
        const totalPaidPledgesForProject = projectPledges.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

        const totalPaidForProject = totalCollectedForProject + totalPaidPledgesForProject;
        const balanceDueForProject = expected - totalPaidForProject;

        // Only add to breakdown if there's an expected amount or some activity
        if (expected > 0 || totalPaidForProject > 0) {
          currentBreakdownItems.push({
            id: project.id,
            name: project.name,
            type: "Project",
            expectedAmount: expected,
            paidAmount: totalPaidForProject,
            balanceDue: balanceDueForProject > 0 ? balanceDueForProject : 0, // Ensure non-negative
            status: balanceDueForProject <= 0 ? "Paid" : "Outstanding",
          });
        }
      }

      setContributions(allMyContributions);
      setTotalContributed(currentTotalContributed);
      setBalanceToPay(currentBalanceToPay);
      setBreakdownItems(currentBreakdownItems); // Set the new breakdown items

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
        View your personal financial contributions, pledges, and outstanding debts.
      </p>

      {/* Contributions Table */}
      <MyContributionsTable contributions={contributions} loading={loading} error={error} />

      {/* New: Breakdown Summary Table */}
      <MyContributionsBreakdownTable
        breakdownItems={breakdownItems}
        loading={loading}
        error={error}
        overallTotalContributed={totalContributed}
        overallBalanceToPay={balanceToPay}
      />
    </div>
  );
};

export default MyContributions;