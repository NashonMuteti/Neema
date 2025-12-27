"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, getMonth, getYear, parseISO } from "date-fns";
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

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid";
  member_name: string;
  project_name: string;
  comments?: string;
}

interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue"; // Fixed: Added "Overdue"
  profiles: { name: string; email: string } | null;
  projects: { name: string } | null;
  comments?: string;
}

const Pledges = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();

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
  const currentMonth = getMonth(new Date());
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Paid" | "Unpaid">("All");
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
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
    if (pledge.status === "Paid") return "Paid";
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

    let financialAccountsData: FinancialAccount[] = [];
    if (currentUser) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance')
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        showError("Failed to load financial accounts.");
      } else {
        financialAccountsData = accountsData || [];
      }
    }

    if (membersError) { console.error("Error fetching members:", membersError); setError("Failed to load members."); }
    else { setMembers(membersData || []); }

    if (projectsError) { console.error("Error fetching projects:", projectsError); setError("Failed to load projects."); }
    else {
      const uniqueProjects = Array.from(new Map((projectsData || []).map(p => [p.id, p])).values());
      setProjects(uniqueProjects);
    }
    setFinancialAccounts(financialAccountsData);

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    let query = supabase
      .from('project_pledges')
      .select(`
        id,
        member_id,
        project_id,
        amount,
        due_date,
        status,
        comments,
        profiles ( name, email ),
        projects ( name )
      `)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString());
      
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
        amount: p.amount,
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
      setPledges(filteredBySearch);
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterStatus, searchQuery, currentUser]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
    }
  };

  const handleEditPledge = (updatedPledge: EditPledgeDialogPledge) => {
    fetchInitialData();
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

    if (pledgeToDelete.status === "Paid") {
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
  };

  const handleMarkAsPaid = async (pledgeId: string, receivedIntoAccountId: string, paymentMethod: string) => {
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

    // Use the atomic transfer function for marking as paid
    const { error: transactionError } = await supabase.rpc('transfer_funds_atomic', {
      p_source_account_id: null,
      p_destination_account_id: receivedIntoAccountId,
      p_amount: pledgeToMark.amount,
      p_actor_profile_id: currentUser.id, // The user performing the action
      p_purpose: `Pledge Payment for Project: ${pledgeToMark.project_name}`,
      p_source: `Pledge Payment from Member: ${pledgeToMark.member_name}`,
      p_is_transfer: false,
      p_project_id: pledgeToMark.project_id,
      p_member_id: pledgeToMark.member_id,
      p_payment_method: paymentMethod,
      p_pledge_id: pledgeId,
      p_transaction_profile_id: pledgeToMark.member_id, // NEW: Associate income transaction with the member who made the pledge
    });

    if (transactionError) {
      console.error("Error marking pledge as paid and updating balance:", transactionError);
      showError(`Failed to mark pledge as paid: ${transactionError.message}`);
    } else {
      showSuccess(`Pledge payment of ${currency.symbol}${pledgeToMark.amount.toFixed(2)} recorded successfully!`);
      fetchInitialData();
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PledgeForm
          members={members}
          projects={projects}
          onRecordPledge={handleRecordPledge}
          canManagePledges={canManagePledges}
        />

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Pledges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PledgeFilters
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
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
              onEditPledge={handleEditPledge}
              onDeletePledge={handleDeletePledge}
              members={members}
              projects={projects}
              financialAccounts={financialAccounts}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;