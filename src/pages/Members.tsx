"use client";

import React from "react";
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
import { showSuccess } from "@/utils/toast";
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
import { useAuth } from "@/context/AuthContext"; // Import useAuth

interface Member {
  id: string;
  name: string;
  email: string;
  enableLogin: boolean;
  imageUrl?: string;
  status: "Active" | "Inactive" | "Suspended";
  // Add other member fields as needed
}

const Members = () => {
  const { isAdmin } = useAuth(); // Use the auth context
  const [members, setMembers] = React.useState<Member[]>([
    { id: "m1", name: "Alice Johnson", email: "alice@example.com", enableLogin: true, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Alice", status: "Active" },
    { id: "m2", name: "Bob Williams", email: "bob@example.com", enableLogin: false, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Bob", status: "Inactive" },
    { id: "m3", name: "Charlie Brown", email: "charlie@example.com", enableLogin: true, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Charlie", status: "Active" },
    { id: "m4", name: "David Green", email: "david@example.com", enableLogin: true, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=David", status: "Suspended" },
  ]);
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Inactive" | "Suspended">("All");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredMembers = members.filter(member => {
    const matchesStatus = filterStatus === "All" || member.status === filterStatus;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleAddMember = (memberData: { name: string; email: string; enableLogin: boolean; imageUrl?: string; defaultPassword?: string }) => {
    const newMember: Member = {
      id: `m${members.length + 1}`, // Simple ID generation
      name: memberData.name,
      email: memberData.email,
      enableLogin: memberData.enableLogin,
      imageUrl: memberData.imageUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${memberData.name}`,
      status: "Active", // Default status for new members
    };
    setMembers((prev) => [...prev, newMember]);
    console.log("Adding member with data:", memberData);
  };

  const handleEditMember = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === updatedMember.id ? updatedMember : member))
    );
    console.log("Editing member:", updatedMember);
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    console.log("Deleting member ID:", memberId);
  };

  const handleToggleMemberStatus = (memberId: string) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, status: member.status === "Active" ? "Inactive" : "Active" }
          : member
      )
    );
    showSuccess("Member status updated!");
  };

  const reportOptions = {
    reportName: "Member List Report",
    brandLogoPath: "/placeholder.svg", // Path to your brand logo
    tagline: "Your cinematic tagline here.",
  };

  const handlePrintPdf = () => {
    exportMembersToPdf(filteredMembers, reportOptions);
    showSuccess("Generating PDF report...");
  };

  const handleExportExcel = () => {
    exportMembersToExcel(filteredMembers, reportOptions);
    showSuccess("Generating Excel report...");
  };

  const getStatusBadgeClasses = (status: Member['status']) => {
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
            {isAdmin && (
              <>
                <Button variant="outline" onClick={handlePrintPdf}>
                  <Printer className="mr-2 h-4 w-4" /> Print PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <AddMemberDialog onAddMember={handleAddMember} />
              </>
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
              {isAdmin && <TableHead className="text-center">Actions</TableHead>}
              <TableHead className="text-center">Contributions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
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
                {isAdmin && (
                  <TableCell className="flex justify-center space-x-2">
                    <EditMemberDialog member={member} onEditMember={handleEditMember} />
                    {member.status !== "Suspended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleMemberStatus(member.id)}
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
        {filteredMembers.length === 0 && (
          <p className="text-muted-foreground text-center mt-4">No members found with status "{filterStatus}" or matching your search.</p>
        )}
      </div>
    </div>
  );
};

export default Members;