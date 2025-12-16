"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  id: string;
  name: string;
}

interface DeleteMemberDialogProps {
  member: Member;
  onDeleteMember: () => void; // Changed to trigger a re-fetch in parent
}

const DeleteMemberDialog: React.FC<DeleteMemberDialogProps> = ({ member, onDeleteMember }) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageMembers } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageMembers: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageMembers = currentUserPrivileges.includes("Manage Members");
    return { canManageMembers };
  }, [currentUser, definedRoles]);

  const handleDelete = async () => {
    // Delete user from Supabase Auth (this will cascade delete from profiles table due to RLS)
    const { error } = await supabase.rpc('delete_user_by_id', { user_id_to_delete: member.id });

    if (error) {
      console.error("Error deleting user from Supabase Auth:", error);
      showError(`Failed to delete ${member.name}: ${error.message}`);
      return;
    }

    onDeleteMember(); // Trigger parent to re-fetch members
    showSuccess(`${member.name} deleted successfully.`);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={!canManageMembers}>Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <span className="font-semibold">{member.name}</span> and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMemberDialog;