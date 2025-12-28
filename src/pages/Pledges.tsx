"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, getMonth, getYear, parseISO, startOfYear, endOfYear } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import PledgeForm from "@/components/pledges/PledgeForm";
import PledgeFilters from "@/components/pledges/PledgeFilters";
import PledgeTable from "@/components/pledges/PledgeTable";
import { Pledge as EditPledgeDialogPledge } from "@/components/pledges/EditPledgeDialog";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Member, FinancialAccount, Pledge } from "@/types/common"; // Updated Pledge import
import { useQueryClient } from "@tanstack/react-query"; // New import

interface Project {
  id: string;
  name: string;
}

interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number; // This is now original_amount
  paid_amount: number; // New field
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string; email: string } | null;
  projects: { name: string } | null;
  comments?: string;
}

const Pledges = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient(); // Initialize queryClient

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const currentYear = getYear(new Date());
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Paid" | "Unpaid">("All");
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const getDisplayPledgeStatus = (pledge: Pledge): "Paid" | "Unpaid" => {
    if (pledge.paid_amount >= pledge.original_amount) return "Paid";
    return "Unpaid";
  };

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true });

    const { data: accountsData, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id')
      .order('name', { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);
    }

    if (membersError) { console.error("Error fetching members:", membersError); setError("Failed to load members."); }
    else { setMembers(membersData || []); }

    if (projectsError) { console.error("Error fetching projects:", projectsError); setError("Failed to load projects."); }
    else {
      const uniqueProjects = Array.from(new Map((projectsData || []).map(p => [p.id, p])).values());
      setProjects(uniqueProjects);
    }

    const startOfPeriod = startOfYear(new Date(parseInt(filterYear), 0, 1));
    const endOfPeriod = endOfYear(new Date(parseInt(filterYear), 0, 1));

    let query = supabase
      .from('project_pledges')
      .select(`
        id,
        member_id,
        project_id,
        amount,
        paid_amount,
        due_date,
        status,
        comments,
        profiles ( name, email ),
        projects ( name )
      `)
      .gte('due_date', startOfPeriod.toISOString())
      .lte('due_date', endOfPeriod.toISOString());
      
    if (filterStatus === "Paid") {
      query = query.eq('status', 'Paid');
    } else if (filterStatus === "Unpaid") {
      query = query.in('status', ['Active', 'Overdue']);
    }

    const { data: pledgesData, error: pledgesError } = (await query.order('due_date', { ascending: false })) as { data: PledgeRowWithJoinedData[] | null, error: PostgrestError | null };

    if (pledgesError) {
      console.error("Error fetching pledges:", pledgesError);
      setError("Failed to load pledges.");
      setPledges([]);
    } else {
      const fetchedPledges: Pledge[] = (pledgesData || []).map(p => ({
        id: p.id,
        member_id: p.member_id,
        project_id: p.project_id,
        original_amount: p.amount,
        paid_amount: p.paid_amount,
        due_date: parseISO(p.due_date),
        status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid",
        member_name: p.profiles?.name || 'Unknown Member',
        project_name: p.projects?.name || 'Unknown Project',
        comments: p.comments || undefined,
      }));

      const filteredBySearch = fetchedPledges.filter(pledge =>
        (pledge.member_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (pledge.project_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pledge.comments || "").toLowerCase().includes(searchQuery.toLowerCase())
      );

      const sortedPledges = filteredBySearch.sort((a, b) => {
        const statusA = getDisplayPledgeStatus(a);
        const statusB = getDisplayPledgeStatus(b);

        if (statusA === "Unpaid" && statusB === "Paid") return -1;
        if (statusA === "Paid" && statusB === "Unpaid") return 1;

        return b.due_date.getTime() - a.due_date.getTime();
      });

      setPledges(sortedPledges);
    }
    setLoading(false);
  }, [filterYear, filterStatus, searchQuery]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
  };

  const handleRecordPledge = async (pledgeData: {
    member_id: string;
    project_id: string;
    amount: number;
    due_date: Date;
    comments?: string;
  }) => {
    if (!currentUser) {
      showError("You must be logged in to record a pledge.");
      return;
    }

    const { error: insertError } = await supabase
      .from('project_pledges')
      .insert({
        member_id: pledgeData.member_id,
        project_id: pledgeData.project_id,
        amount: pledgeData.amount,
        paid_amount: 0, // New pledges start with 0 paid_amount
        due_date: pledgeData.due_date.toISOString(),
        status: "Active",
        comments: pledgeData.comments,
      });

    if (insertError) {
      console.error("Error recording pledge:", insertError);
      showError("Failed to record pledge.");
    } else {
      showSuccess("Pledge recorded successfully!");
      fetchInitialData();
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleEditPledge = (updatedPledge: EditPledgeDialogPledge) => {
    fetchInitialData();
    invalidateDashboardQueries(); // Invalidate dashboard queries
  };

  const handleDeletePledge = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to delete pledges.");
      return;
    }

    const pledgeToDelete = pledges.find(p => p.id === id);
    if (!pledgeToDelete) {
      showError("Pledge not found.");
      return;
    }

    if (pledgeToDelete.paid_amount > 0) { // Check paid_amount instead of status
      // Use the atomic reversal function for paid pledges
      const { error: rpcError } = await supabase.rpc('reverse_paid_pledge_atomic', {
        p_pledge_id: id,
        p_profile_id: currentUser.id,
      });

      if (rpcError) {
        console.error("Error reversing paid pledge:", rpcError);
        showError(`Failed to delete paid pledge: ${rpcError.message}`);
        return;
      }
    } else {
      // For unpaid pledges, proceed with direct deletion
      const { error: deleteError } = await supabase
        .from('project_pledges')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error("Error deleting pledge:", deleteError);
        showError("Failed to delete pledge.");
        return;
      }
    }

    showSuccess("Pledge deleted successfully!");
    fetchInitialData();
    invalidateDashboardQueries(); // Invalidate dashboard queries
  };

  const handleMarkAsPaid = async (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => {
    if (!canManagePledges) {
      showError("You do not have permission to mark pledges as paid.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to mark pledges as paid.");
      return;
    }

    const pledgeToMark = pledges.find(p => p.id === pledgeId);
    if (!pledgeToMark) {
      showError("Pledge not found.");
      return;
    }

    // Call the new atomic RPC function for pledge payments
    const { error: rpcError } = await supabase.rpc('record_pledge_payment_atomic', {
      p_pledge_id: pledgeId,
      p_amount_paid: amountPaid,
      p_received_into_account_id: receivedIntoAccountId,
      p_actor_profile_id: currentUser.id,
      p_payment_date: paymentDate.toISOString(),
    });

    if (rpcError) {
      console.error("Error recording pledge payment:", rpcError);
      showError(`Failed to record pledge payment: ${rpcError.message}`);
    } else {
      showSuccess(`Pledge payment of ${currency.symbol}${amountPaid.toFixed(2)} recorded successfully!`);
      fetchInitialData();
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-muted-foreground">Loading pledges data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
      <p className="text-lg text-muted-foreground">
        Record and track financial commitments (pledges) from members for various projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Adjusted grid layout */}
        <PledgeForm
          members={members}
          projects={projects}
          onRecordPledge={handleRecordPledge}
          canManagePledges={canManagePledges}
        />

        <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl"> {/* Adjusted column span */}
          <CardHeader>
            <CardTitle>Recent Pledges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PledgeFilters
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              months={months}
              years={years}
            />
            {/* Removed global paidIntoAccount select, now handled by dialog */}

            <PledgeTable
              pledges={pledges}
              canManagePledges={canManagePledges}
              onMarkAsPaid={handleMarkAsPaid}
              onEditPledge={handleEditPledge} // Pass the handler here
              onDeletePledge={handleDeletePledge}
              financialAccounts={financialAccounts}
              currency={currency}
              isProcessing={false} // Pass isProcessing prop
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;