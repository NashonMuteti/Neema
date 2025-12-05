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

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

interface Member {
  id: string;
  name: string;
  email: string;
  enableLogin: boolean;
  // Add other member fields as needed
}

const Members = () => {
  const [members, setMembers] = React.useState<Member[]>([
    { id: "m1", name: "Alice Johnson", email: "alice@example.com", enableLogin: true },
    { id: "m2", name: "Bob Williams", email: "bob@example.com", enableLogin: false },
    { id: "m3", name: "Charlie Brown", email: "charlie@example.com", enableLogin: true },
  ]);

  const handleAddMember = (memberData: { name: string; email: string; enableLogin: boolean; defaultPassword?: string }) => {
    const newMember: Member = {
      id: `m${members.length + 1}`, // Simple ID generation
      name: memberData.name,
      email: memberData.email,
      enableLogin: memberData.enableLogin,
    };
    setMembers((prev) => [...prev, newMember]);
    // In a real app, you'd send memberData to a backend, including defaultPassword if login is enabled.
    console.log("Adding member with data:", memberData);
  };

  const handleEditMember = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === updatedMember.id ? updatedMember : member))
    );
    // In a real app, you'd send updatedMember to a backend.
    console.log("Editing member:", updatedMember);
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    // In a real app, you'd send memberId to a backend for deletion.
    console.log("Deleting member ID:", memberId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Members</h1>
      <p className="text-lg text-muted-foreground">
        View and manage all members of your organization.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Member List</h2>
          {isAdmin && (
            <AddMemberDialog onAddMember={handleAddMember} />
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Login Enabled</TableHead>
              {isAdmin && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell className="text-center">
                  {member.enableLogin ? "Yes" : "No"}
                </TableCell>
                {isAdmin && (
                  <TableCell className="flex justify-center space-x-2">
                    <EditMemberDialog member={member} onEditMember={handleEditMember} />
                    <DeleteMemberDialog member={member} onDeleteMember={handleDeleteMember} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Members;