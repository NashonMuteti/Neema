"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AddMemberDialog from "@/components/members/AddMemberDialog";
import EditMemberDialog from "@/components/members/EditMemberDialog";
import DeleteMemberDialog from "@/components/members/DeleteMemberDialog";
import { showSuccess, showError } from "@/utils/toast";
import { User as UserIcon, Printer, FileSpreadsheet, Search, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { exportMembersToPdf, exportMembersToExcel } from "@/utils/reportUtils";
import { Link } from "react-router-dom";
import { useAuth, User } from "@/context/AuthContext"; // Import useAuth and User interface
import { useBranding } from "@/context/BrandingContext"; // Import useBranding
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client

const Members = () => {
  const { currentUser } = useAuth(); // Use the auth context to get current user
  const { userRoles: definedRoles } = useUserRoles(); // Get all defined roles

  // Determine if the current user has the "Manage Members" privilege
  const { canManageMembers, canExportPdf, canExportExcel } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageMembers: false, canExportPdf: false, canExportExcel: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageMembers = currentUserPrivileges.includes("Manage Members"); // Check for the specific privilege
    const canExportPdf = currentUserPrivileges.includes("Export Member List PDF"); // New privilege check
    const canExportExcel = currentUserPrivileges.includes("Export Member List Excel"); // New privilege check
    return { canManageMembers, canExportPdf, canExportExcel };
  }, [currentUser, definedRoles]);

  const { brandLogoUrl, tagline } = useBranding(); // Use the branding context

  const [members, setMembers] = React.useState<User[]>([]); // Use the centralized User interface
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
        role: p.role || "Contributor", // Default role if not set
      })));
    }
    setLoading(false);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = () => {
    fetchMembers(); // Re-fetch members after adding
  };

  const handleEditMember = () => {
    fetchMembers(); // Re-fetch members after editing
  };

  const handleDeleteMember = () => {
    fetchMembers(); // Re-fetch members after deleting
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
  };

  const reportOptions = {
    reportName: "Member List Report",
    brandLogoUrl: brandLogoUrl, // Pass dynamic logo URL
    tagline: tagline,           // Pass dynamic tagline
  };

  const handlePrintPdf = () => {
    exportMembersToPdf(members, reportOptions); // Use fetched members
    showSuccess("Generating PDF report...");
  };

  const handleExportExcel = () => {
    exportMembersToExcel(members, reportOptions); // Use fetched members
    showSuccess("Generating Excel report...");
  };

  const getStatusBadgeClasses = (status: User['status']) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Suspended":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
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
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-semibold">Member List</h2>
            <Select value={filterStatus} onValueChange={(value: "All" | "Active" | "Inactive" | "Suspended") => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="All">All Members</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex gap-2">
            {canExportPdf && (
              <Button variant="outline" onClick={handlePrintPdf}>
                <Printer className="mr-2 h-4 w-4" /> Print PDF
              </Button>
            )}
            {canExportExcel && (
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            )}
            {canManageMembers && (
              <AddMemberDialog onAddMember={handleAddMember} />
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Login Enabled</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canManageMembers && <TableHead className="text-center">Actions</TableHead>}
              <TableHead className="text-center">Contributions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell className="text-center">
                  {member.enableLogin ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClasses(member.status)}`}>
                    {member.status}
                  </span>
                </TableCell>
                {canManageMembers && (
                  <TableCell className="flex justify-center space-x-2">
                    <EditMemberDialog member={member} onEditMember={handleEditMember} />
                    {member.status !== "Suspended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleMemberStatus(member.id, member.status)}
                      >
                        {member.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                    <DeleteMemberDialog member={member} onDeleteMember={handleDeleteMember} />
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Link to={`/members/${member.id}/contributions`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {members.length === 0 && (
          <p className="text-muted-foreground text-center mt-4">No members found with status "{filterStatus}" or matching your search.</p>
        )}
      </div>
    </div>
  );
};

export default Members;