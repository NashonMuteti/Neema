"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, getMonth, getYear, isBefore, startOfDay, parseISO } from "date-fns";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { PostgrestError } from "@supabase/supabase-js";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export interface Pledge {
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

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const usePledgeManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManagePledges } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State for new pledge
  const [newPledgeMemberId, setNewPledgeMemberId] = useState<string | undefined>(undefined);
  const [newPledgeProjectId, setNewPledgeProjectId] = useState<string | undefined>(undefined);
  const [newPledgeAmount, setNewPledgeAmount] = useState("");
  const [newPledgeDueDate, setNewPledgeDueDate] = useState<Date | undefined>(undefined);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Paid" | "Overdue">("All");
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState("");

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  })), []);

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  })), [currentYear]);

  const getPledgeStatus = useCallback((pledge: Pledge): Pledge['status'] => {
    if (pledge.status === "Paid") return "Paid";
    const today = startOfDay(new Date());
    const dueDate = startOfDay(pledge.due_date);
    if (isBefore(dueDate, today)) {
      return "Overdue";
    }
    return "Active";
  }, []);

  const getStatusBadgeClasses = useCallback((status: Pledge['status']): BadgeVariant => {
    switch (status) {
      case "Active":
        return "default"; // Maps to primary color
      case "Paid":
        return "default"; // Maps to primary color (can be green in some themes)
      case "Overdue":
        return "destructive"; // Maps to red
      default:
        return "outline"; // Neutral outline
    }
  }, []);

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
      if (membersData && membersData.length > 0 && !newPledgeMemberId) {
        setNewPledgeMemberId(membersData[0].id);
      }
    }

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      setError("Failed to load projects.");
    } else {
      setProjects(projectsData || []);
      if (projectsData && projectsData.length > 0 && !newPledgeProjectId) {
        setNewPledgeProjectId(projectsData[0].id);
      }
    }

    // Fetch pledges based on filters
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: pledgesData, error: pledgesError } = await supabase
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
      .order('due_date', { ascending: false }) as { data: PledgeRowWithJoinedData[] | null, error: PostgrestError | null };

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
        member_name: p.profiles?.name || 'Unknown Member',
        project_name: p.projects?.name || 'Unknown Project',
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
  }, [newPledgeMemberId, newPledgeProjectId, filterMonth, filterYear, filterStatus, searchQuery, getPledgeStatus]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRecordPledge = useCallback(async () => {
    if (!currentUser) {
      showError("You must be logged in to record a pledge.");
      return;
    }
    if (!newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const amount = parseFloat(newPledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    const { error: insertError } = await supabase
      .from('project_pledges')
      .insert({
        member_id: newPledgeMemberId,
        project_id: newPledgeProjectId,
        amount,
        due_date: newPledgeDueDate.toISOString(),
        status: "Active",
      });

    if (insertError) {
      console.error("Error recording pledge:", insertError);
      showError("Failed to record pledge.");
    } else {
      showSuccess("Pledge recorded successfully!");
      fetchInitialData();
      setNewPledgeAmount("");
      setNewPledgeDueDate(undefined);
      setNewPledgeMemberId(members.length > 0 ? members[0].id : undefined);
      setNewPledgeProjectId(projects.length > 0 ? projects[0].id : undefined);
    }
  }, [currentUser, newPledgeMemberId, newPledgeProjectId, newPledgeAmount, newPledgeDueDate, fetchInitialData, members, projects]);

  const handleEditPledge = useCallback((id: string) => {
    console.log("Editing pledge:", id);
    showError(`Edit functionality for pledge ${id} is not yet implemented.`);
  }, []);

  const handleDeletePledge = useCallback(async (id: string) => {
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
      fetchInitialData();
    }
  }, [canManagePledges, fetchInitialData]);

  const handleMarkAsPaid = useCallback(async (id: string) => {
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
      showSuccess("Pledge marked as paid!");
      fetchInitialData();
    }
  }, [canManagePledges, fetchInitialData]);

  return {
    members,
    projects,
    pledges: pledges, // Use the filtered pledges
    loading,
    error,
    canManagePledges,
    newPledgeMemberId,
    setNewPledgeMemberId,
    newPledgeProjectId,
    setNewPledgeProjectId,
    newPledgeAmount,
    setNewPledgeAmount,
    newPledgeDueDate,
    setNewPledgeDueDate,
    filterStatus,
    setFilterStatus,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    getPledgeStatus,
    getStatusBadgeClasses,
    handleRecordPledge,
    handleEditPledge,
    handleDeletePledge,
    handleMarkAsPaid,
  };
};