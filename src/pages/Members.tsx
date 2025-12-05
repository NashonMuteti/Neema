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
import { User as UserIcon } from "lucide-react"; // Import User icon for placeholder
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

interface Member {
  id: string;
  name: string;
  email: string;
  enableLogin: boolean;
  imageUrl?: string;
  status: "Active" | "Inactive"; // Added status property
  // Add other member fields as needed
}

const Members = () => {
  const [members, setMembers] = React.useState<Member[]>([
    { id: "m1", name: "Alice Johnson", email: "alice@example.com", enableLogin: true, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Alice", status: "Active" },
    { id: "m2", name: "Bob Williams", email: "bob@example.com", enableLogin: false, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Bob", status: "Inactive" },
    { id: "m3", name: "Charlie Brown", email: "charlie@example.com", enableLogin: true, imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Charlie", status: "Active" },
  ]);
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Inactive">("All");

  const filteredMembers = members.filter(member => {
    if (filterStatus === "All") {
      return true;
    }
    return member.status === filterStatus;
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Members</h1>
      <p className="text-lg text-muted-foreground">
        View and manage all members of your organization.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Member List</h2>
            <Select value={filterStatus} onValueChange={(value: "All" | "Active" | "Inactive") => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="All">All Members</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <AddMemberDialog onAddMember={handleAddMember} />
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Login Enabled</TableHead>
              <TableHead className="text-center">Status</TableHead> {/* New TableHead for Status */}
              {isAdmin && <TableHead className="text-center">Actions</TableHead>}
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
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    member.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}>
                    {member.status}
                  </span>
                </TableCell>
                {isAdmin && (
                  <TableCell className="flex justify-center space-x-2">
                    <EditMemberDialog member={member} onEditMember={handleEditMember} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleMemberStatus(member.id)}
                    >
                      {member.status === "Active" ? "Deactivate" : "Activate"}
                    </Button>
                    <DeleteMemberDialog member={member} onDeleteMember={handleDeleteMember} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredMembers.length === 0 && (
          <p className="text-muted-foreground text-center mt-4">No members found with status "{filterStatus}".</p>
        )}
      </div>
    </div>
  );
};

export default Members;