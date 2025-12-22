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
import { useAuth, User } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useMemberManagement } from "@/hooks/use-member-management"; // Import the new hook
import { getStatusBadgeClasses } from "@/utils/memberUtils"; // Import the utility function

const Members = () => {
  const { currentUser } = useAuth(); // Still need currentUser for privilege checks in dialogs
  const { userRoles: definedRoles } = useUserRoles(); // Still need definedRoles for privilege checks in dialogs

  const {
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
    refreshMembers, // Use the refresh function from the hook
  } = useMemberManagement();

  const { brandLogoUrl, tagline } = useBranding();

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
              <AddMemberDialog onAddMember={refreshMembers} />
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
                    <EditMemberDialog member={member} onEditMember={refreshMembers} />
                    {member.status !== "Suspended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleMemberStatus(member.id, member.status)}
                      >
                        {member.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                    <DeleteMemberDialog member={member} onDeleteMember={refreshMembers} />
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