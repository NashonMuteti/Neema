"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import MyContributionsTable from "@/components/my-contributions/MyContributionsTable";
import MyContributionsBreakdownTable from "@/components/my-contributions/MyContributionsBreakdownTable";
import { MyContribution, JoinedProject, DebtRow, ContributionBreakdownItem } from "@/types/common";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

type ActiveProjectSummary = {
  projectId: string;
  projectName: string;
  expectedTotal: number;
  totalContributed: number;
  totalPledged: number;
  totalPaid: number;
  totalAmountPaid: number;
  balanceToPay: number;
};

const MyContributions = () => {
  const { currentUser } = useAuth();
  const { currency } = useSystemSettings();

  const [contributions, setContributions] = useState<MyContribution[]>([]);
  const [totalContributed, setTotalContributed] = useState(0);
  const [balanceToPay, setBalanceToPay] = useState(0);
  const [breakdownItems, setBreakdownItems] = useState<ContributionBreakdownItem[]>([]);
  const [activeProjectSummaries, setActiveProjectSummaries] = useState<ActiveProjectSummary[]>([]);

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
        currentTotalContributed += c.amount;
        return {
          id: c.id,
          project_id: c.project_id,
          project_name: c.projects?.name || 'Unknown Project',
          amount: c.amount,
          date: parseISO(c.date),
          type: "Collection",
          expected_amount: c.amount,
          balance_amount: 0,
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

        currentTotalContributed += paidAmount;
        currentBalanceToPay += balance;

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
          amount: originalAmount,
          original_amount: originalAmount,
          paid_amount: paidAmount,
          date: parseISO(p.due_date),
          due_date: parseISO(p.due_date),
          type: "Pledge",
          status: paidAmount >= originalAmount ? "Paid" : "Active",
          expected_amount: originalAmount,
          balance_amount: balance,
        };
      });
      allMyContributions = [...allMyContributions, ...fetchedPledges];

      // --- Fetch Debts ---
      const { data: debtsData, error: debtsError } = (await supabase
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
        .order('created_at', { ascending: false })) as { data: DebtRow[] | null, error: PostgrestError | null };

      if (debtsError) throw debtsError;

      const fetchedDebts: MyContribution[] = (debtsData || []).map(d => {
        const originalAmount = d.original_amount;
        const amountDue = d.amount_due;
        const paidAmount = originalAmount - amountDue;

        currentTotalContributed += paidAmount;
        currentBalanceToPay += amountDue;

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
          project_name: d.description || 'Personal Debt',
          description: d.description,
          amount: originalAmount,
          original_amount: originalAmount,
          paid_amount: paidAmount,
          date: d.due_date ? parseISO(d.due_date) : parseISO(d.created_at),
          due_date: d.due_date ? parseISO(d.due_date) : undefined,
          type: "Debt",
          status: d.status,
          expected_amount: originalAmount,
          balance_amount: amountDue,
        };
      });
      allMyContributions = [...allMyContributions, ...fetchedDebts];

      // --- Fetch Active Projects for Expected Contributions + Build vivid summary ---
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, member_contribution_amount')
        .eq('status', 'Open');

      if (projectsError) throw projectsError;

      const summaries: ActiveProjectSummary[] = [];

      for (const project of (projectsData || [])) {
        const expected = project.member_contribution_amount || 0;

        const projectCollections = fetchedCollections.filter(c => c.project_id === project.id);
        const totalCollectedForProject = projectCollections.reduce((sum, c) => sum + c.amount, 0);

        const projectPledges = fetchedPledges.filter(p => p.project_id === project.id);
        const totalPledgedForProject = projectPledges.reduce((sum, p) => sum + (p.original_amount || p.amount || 0), 0);
        const totalPaidPledgesForProject = projectPledges.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

        const totalAmountPaidForProject = totalCollectedForProject + totalPaidPledgesForProject;
        const balanceDueForProject = Math.max(expected - totalAmountPaidForProject, 0);

        if (expected > 0 || totalPledgedForProject > 0 || totalAmountPaidForProject > 0) {
          summaries.push({
            projectId: project.id,
            projectName: project.name,
            expectedTotal: expected,
            totalContributed: totalCollectedForProject,
            totalPledged: totalPledgedForProject,
            totalPaid: totalPaidPledgesForProject,
            totalAmountPaid: totalAmountPaidForProject,
            balanceToPay: balanceDueForProject,
          });

          currentBreakdownItems.push({
            id: project.id,
            name: project.name,
            type: "Project",
            expectedAmount: expected,
            paidAmount: totalAmountPaidForProject,
            balanceDue: balanceDueForProject,
            status: balanceDueForProject <= 0 ? "Paid" : "Outstanding",
          });
        }
      }

      summaries.sort((a, b) => a.projectName.localeCompare(b.projectName));

      setActiveProjectSummaries(summaries);
      setContributions(allMyContributions);
      setTotalContributed(currentTotalContributed);
      setBalanceToPay(currentBalanceToPay);
      setBreakdownItems(currentBreakdownItems);

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

  const summaryTotals = React.useMemo(() => {
    const expectedTotal = activeProjectSummaries.reduce((sum, p) => sum + p.expectedTotal, 0);
    const totalContributed = activeProjectSummaries.reduce((sum, p) => sum + p.totalContributed, 0);
    const totalPledged = activeProjectSummaries.reduce((sum, p) => sum + p.totalPledged, 0);
    const totalPaid = activeProjectSummaries.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalAmountPaid = activeProjectSummaries.reduce((sum, p) => sum + p.totalAmountPaid, 0);
    const balanceToPay = activeProjectSummaries.reduce((sum, p) => sum + p.balanceToPay, 0);
    const paidProjects = activeProjectSummaries.filter((p) => p.expectedTotal > 0 && p.balanceToPay <= 0).length;

    return {
      expectedTotal,
      totalContributed,
      totalPledged,
      totalPaid,
      totalAmountPaid,
      balanceToPay,
      paidProjects,
      activeProjects: activeProjectSummaries.length,
    };
  }, [activeProjectSummaries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          {currentUser.imageUrl ? (
            <AvatarImage src={currentUser.imageUrl} alt={currentUser.name} />
          ) : (
            <AvatarFallback>
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        View your personal financial contributions, pledges, and outstanding debts.
      </p>

      {/* NEW: Vivid summary analysis for active projects */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <CardTitle>Active Projects Summary (Your Position)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Expected Contribution Total</div>
              <div className="text-xl font-extrabold text-primary">{currency.symbol}{summaryTotals.expectedTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Contributed (Collections)</div>
              <div className="text-xl font-extrabold text-green-600">{currency.symbol}{summaryTotals.totalContributed.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Pledged</div>
              <div className="text-xl font-extrabold text-blue-600">{currency.symbol}{summaryTotals.totalPledged.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Paid (Pledges Paid)</div>
              <div className="text-xl font-extrabold text-emerald-600">{currency.symbol}{summaryTotals.totalPaid.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Amount Paid (Collections + Paid Pledges)</div>
              <div className="text-xl font-extrabold text-foreground">{currency.symbol}{summaryTotals.totalAmountPaid.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Balance to Pay</div>
              <div className="text-xl font-extrabold text-destructive">{currency.symbol}{summaryTotals.balanceToPay.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Active projects: {summaryTotals.activeProjects}</Badge>
            <Badge className="bg-green-600 text-white hover:bg-green-600">Fully paid: {summaryTotals.paidProjects}</Badge>
          </div>

          {activeProjectSummaries.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Contributed</TableHead>
                    <TableHead className="text-right">Pledged</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeProjectSummaries.map((p) => (
                    <TableRow key={p.projectId}>
                      <TableCell className="font-semibold">{p.projectName}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{currency.symbol}{p.expectedTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{currency.symbol}{p.totalContributed.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{currency.symbol}{p.totalPledged.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{currency.symbol}{p.totalPaid.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{currency.symbol}{p.totalAmountPaid.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-extrabold text-destructive">{currency.symbol}{p.balanceToPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active project contribution data found yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Contributions Table */}
      <MyContributionsTable contributions={contributions} loading={loading} error={error} />

      {/* Breakdown Summary Table */}
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