"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { exportMembersToPdf, exportMembersToExcel } from "@/utils/reportUtils";
import { useAuth, User } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import MemberFilters from "@/components/members/MemberFilters";
import MemberListTable from "@/components/members/MemberListTable";
import MemberActions from "@/components/members/MemberActions";

const Members = () => {
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

  const { brandLogoUrl, tagline } = useBranding();

  const [members, setMembers] = React.useState<User[]>([]);
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Inactive" | "Suspended">("All");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
        receiveNotifications: p.receive_notifications ?? true,
      })));
    }
    setLoading(false);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = () => {
    fetchMembers();
  };

  const handleEditMember = () => {
    fetchMembers();
  };

  const handleDeleteMember = () => {
    fetchMembers();
  };

  const handleToggleMemberStatus = async (memberId: string, currentStatus: User['status']) => {
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
      newStatus = "Active";
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
      fetchMembers();
    }
  };

  const reportOptions = {
    reportName: "Member List Report",
    brandLogoUrl: brandLogoUrl,
    tagline: tagline,
  };

  const handlePrintPdf = () => {
    exportMembersToPdf(members, reportOptions);
    showSuccess("Generating PDF report...");
  };

  const handleExportExcel = () => {
    exportMembersToExcel(members, reportOptions);
    showSuccess("Generating Excel report...");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Members</h1>
        <p className="text-lg text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Members</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Members</h1>
      <p className="text-lg text-muted-foreground">
        View and manage all members of your organization.
      </p>
      <Card className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <MemberFilters
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <MemberActions
            canExportPdf={canExportPdf}
            canExportExcel={canExportExcel}
            canAddMember={canManageMembers}
            onPrintPdf={handlePrintPdf}
            onExportExcel={handleExportExcel}
            onAddMember={handleAddMember}
          />
        </CardHeader>
        <CardContent>
          <MemberListTable
            members={members}
            canManageMembers={canManageMembers}
            onEditMember={handleEditMember}
            onDeleteMember={handleDeleteMember}
            onToggleMemberStatus={handleToggleMemberStatus}
          />
          {members.length === 0 && (
            <p className="text-muted-foreground text-center mt-4">No members found with status "{filterStatus}" or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Members;