"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, User } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { getStatusBadgeClasses } from "@/utils/memberUtils"; // Import utility

export const useMemberManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageMembers, canExportPdf, canExportExcel } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageMembers: false, canExportPdf: false, canExportExcel: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageMembers = currentUserPrivileges.includes("Manage Members");
    const canExportPdf = currentUserPrivileges.includes("Export Member List PDF");
    const canExportExcel = currentUserPrivileges.includes("Export Member List Excel");
    return { canManageMembers, canExportPdf, canExportExcel };
  }, [currentUser, definedRoles]);

  const [members, setMembers] = useState<User[]>([]);
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Inactive" | "Suspended">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('profiles').select('*');

    if (filterStatus !== "All") {
      query = query.eq('status', filterStatus);
    }

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      setError("Failed to load members.");
      showError("Failed to load members.");
      setMembers([]);
    } else {
      setMembers(data.map(p => ({
        id: p.id,
        name: p.name || p.email || "Unknown",
        email: p.email || "N/A",
        enableLogin: p.enable_login ?? false,
        imageUrl: p.image_url || undefined,
        status: p.status as "Active" | "Inactive" | "Suspended",
        role: p.role || "Contributor",
      })));
    }
    setLoading(false);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleToggleMemberStatus = useCallback(async (memberId: string, currentStatus: User['status']) => {
    if (!canManageMembers) {
      showError("You do not have permission to change member status.");
      return;
    }

    let newStatus: User['status'];
    if (currentStatus === "Active") {
      newStatus = "Inactive";
    } else if (currentStatus === "Inactive") {
      newStatus = "Active";
    } else {
      newStatus = "Active"; // If suspended, reactivate
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', memberId);

    if (error) {
      console.error("Error updating member status:", error);
      showError("Failed to update member status.");
    } else {
      showSuccess(`Member status updated to '${newStatus}'!`);
      fetchMembers(); // Re-fetch to update UI
    }
  }, [canManageMembers, fetchMembers]);

  return {
    members,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    canManageMembers,
    canExportPdf,
    canExportExcel,
    handleToggleMemberStatus,
    getStatusBadgeClasses, // Expose the utility function
    refreshMembers: fetchMembers, // Expose refresh function
  };
};