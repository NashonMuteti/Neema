"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import MyContributionsOverviewTab from "@/components/my-contributions/MyContributionsOverviewTab";
import MyContributionsDetailedTab from "@/components/my-contributions/MyContributionsDetailedTab";
import MemberContributionsOverview from "@/components/my-contributions/MemberContributionsOverview";
import MemberContributionsDetailed from "@/components/my-contributions/MemberContributionsDetailed";
import { MyContribution, MyFinancialAccount } from "@/components/my-contributions/types"; // Import types

const MyContributions = () => {
  const { currentUser } = useAuth();
  const [contributions, setContributions] = useState<MyContribution[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<MyFinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyContributions = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Fetch collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('project_collections')
        .select(`
          id,
          project_id,
          amount,
          date,
          projects ( name )
        `)
        .eq('member_id', currentUser.id)
        .order('date', { ascending: false });

      if (collectionsError) throw collectionsError;

      const fetchedCollections: MyContribution[] = (collectionsData || []).map(c => ({
        id: c.id,
        project_id: c.project_id,
        project_name: c.projects?.name || 'Unknown Project',
        amount: c.amount,
        date: parseISO(c.date),
        type: "Collection",
      }));

      // Fetch pledges
      const { data: pledgesData, error: pledgesError } = await supabase
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
        .order('due_date', { ascending: false });

      if (pledgesError) throw pledgesError;

      const fetchedPledges: MyContribution[] = (pledgesData || []).map(p => ({
        id: p.id,
        project_id: p.project_id,
        project_name: p.projects?.name || 'Unknown Project',
        amount: p.amount, // This is the original pledged amount
        original_amount: p.amount, // Store original amount explicitly
        paid_amount: p.paid_amount, // Store paid amount
        date: parseISO(p.due_date), // Use due_date as primary date for sorting/display
        due_date: parseISO(p.due_date),
        type: "Pledge",
        status: p.paid_amount >= p.amount ? "Paid" : "Active", // Derive status based on paid_amount
      }));

      // Fetch financial accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance')
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });

      if (accountsError) throw accountsError;

      setFinancialAccounts(accountsData || []);

      setContributions([...fetchedCollections, ...fetchedPledges]);
    } catch (err: any) {
      console.error("Error fetching contributions:", err);
      setError(err.message || "Failed to load contributions.");
      showError(err.message || "Failed to load contributions.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMyContributions();
    }
  }, [currentUser, fetchMyContributions]);

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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <MyContributionsOverviewTab contributions={contributions} loading={loading} error={error} />
        </TabsContent>
        <TabsContent value="detailed">
          <MyContributionsDetailedTab contributions={contributions} loading={loading} error={error} />
        </TabsContent>
        <TabsContent value="accounts">
          <MemberContributionsOverview financialAccounts={financialAccounts} loading={loading} error={error} />
        </TabsContent>
        <TabsContent value="summary">
          <MemberContributionsDetailed contributions={contributions} financialAccounts={financialAccounts} loading={loading} error={error} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyContributions;