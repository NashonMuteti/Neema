"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import EditMemberDialog from "./EditMemberDialog";
import DeleteMemberDialog from "./DeleteMemberDialog";
import { User } from "@/context/AuthContext"; // Import the User interface

interface MemberListTableProps {
  members: User[];
  canManageMembers: boolean;
  onEditMember: () => void;
  onDeleteMember: () => void;
  onToggleMemberStatus: (memberId: string, currentStatus: User['status']) => void;
}

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

const MemberListTable: React.FC<MemberListTableProps> = ({
  members,
  canManageMembers,
  onEditMember,
  onDeleteMember,
  onToggleMemberStatus,
}) => {
  return (
    <>
      {members.length > 0 ? (
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
                    <img src={member.imageUrl} alt={member.name} className="h-32 w-32 rounded-full object-cover" /> {/* Increased size */}
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center"> {/* Increased size */}
                      <UserIcon className="h-16 w-16 text-muted-foreground" /> {/* Scaled icon */}
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
                    <EditMemberDialog member={member} onEditMember={onEditMember} />
                    {member.status !== "Suspended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleMemberStatus(member.id, member.status)}
                      >
                        {member.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                    <DeleteMemberDialog member={member} onDeleteMember={onDeleteMember} />
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
      ) : (
        <p className="text-muted-foreground text-center mt-4">No members found.</p>
      )}
    </>
  );
};

export default MemberListTable;