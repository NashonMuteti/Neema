"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, getMonth, getYear, parseISO, isBefore, startOfDay } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import PledgeForm from "@/components/pledges/PledgeForm";
import PledgeFilters from "@/components/pledges/PledgeFilters";
import PledgeTable from "@/components/pledges/PledgeTable";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid" | "Overdue";
  member_name: string;
  project_name: string;
}

// Define the expected structure of a pledge row with joined profile and project data
interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string } | null; // Joined profile data
  projects: { name: string } | null; // Joined project data
}

const Pledges = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  // Data states
  const [members, setMembers] = React.useState<Member[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Paid" | "Overdue">("All");
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

  const getPledgeStatus = (pledge: Pledge): Pledge['status'] => {
    if (pledge.status === "Paid") return "Paid";
    const today = startOfDay(new Date());
    const dueDate = startOfDay(pledge.due_date);
    if (isBefore(dueDate, today)) {
      return "Overdue";
    }
    return "Active";
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

    if (membersError) {
      console.error("Error fetching members:", membersError);
      setError("Failed to load members.");
    } else {
      setMembers(membersData || []);
    }

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      setError("Failed to load projects.");
    } else {
      setProjects(projectsData || []);
    }

    // Fetch pledges based on filters
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: pledgesData, error: pledgesError } = (await supabase
      .from('project_pledges')
      .select(`
        id,
        member_id,
        project_id,
        amount,
        due_date,
        status,
        profiles ( name ),
        projects ( name )
      `)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString())
      .order('due_date', { ascending: false })) as { data: PledgeRowWithJoinedData[] | null, error: PostgrestError | null };

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
        status: p.status as "Active" | "Paid" | "Overdue",
        member_name: p.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
        project_name: p.projects?.name || 'Unknown Project', // Access name directly from typed projects
      }));

      const filteredByStatusAndSearch = fetchedPledges.filter(pledge => {
        const actualStatus = getPledgeStatus(pledge);
        const matchesStatus = filterStatus === "All" || actualStatus === filterStatus;
        const memberName = (pledge.member_name || "").toLowerCase();
        const projectName = (pledge.project_name || "").toLowerCase();
        const matchesSearch = memberName.includes(searchQuery.toLowerCase()) || projectName.includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });
      setPledges(filteredByStatusAndSearch);
    }
    setLoading(false);
  }, [filterMonth, filterYear, filterStatus, searchQuery]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRecordPledge = async (pledgeData: {
    member_id: string;
    project_id: string;
    amount: number;
    due_date: Date;
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
        status: "Active", // New pledges are active by default
      });

    if (insertError) {
      console.error("Error recording pledge:", insertError);
      showError("Failed to record pledge.");
    } else {
      showSuccess("Pledge recorded successfully!");
      fetchInitialData(); // Re-fetch all data to update lists
    }
  };

  const handleEditPledge = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with pledge data
    console.log("Editing pledge:", id);
    showError(`Edit functionality for pledge ${id} is not yet implemented.`);
  };

  const handleDeletePledge = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    const { error: deleteError } = await supabase
      .from('project_pledges')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Error deleting pledge:", deleteError);
      showError("Failed to delete pledge.");
    } else {
      showSuccess("Pledge deleted successfully!");
      fetchInitialData(); // Re-fetch all data to update lists
    }
  };

  const handleMarkAsPaid = async (id: string, memberName: string, amount: number) => {
    if (!canManagePledges) {
      showError("You do not have permission to mark pledges as paid.");
      return;
    }
    const { error: updateError } = await supabase
      .from('project_pledges')
      .update({ status: "Paid" })
      .eq('id', id);

    if (updateError) {
      console.error("Error marking pledge as paid:", updateError);
      showError("Failed to mark pledge as paid.");
    } else {
      showSuccess(`Payment initiated for ${memberName}'s pledge of $${amount.toFixed(2)}.`);
      fetchInitialData(); // Re-fetch all data to update lists
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
        {/* Record New Pledge Card */}
        <PledgeForm
          members={members}
          projects={projects}
          onRecordPledge={handleRecordPledge}
          canManagePledges={canManagePledges}
        />

        {/* Recent Pledges Card */}
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

            <PledgeTable
              pledges={pledges}
              canManagePledges={canManagePledges}
              onMarkAsPaid={handleMarkAsPaid}
              onEditPledge={handleEditPledge}
              onDeletePledge={handleDeletePledge}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;