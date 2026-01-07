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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddEditBoardMemberDialog, { BoardMember } from "@/components/board-members/AddEditBoardMemberDialog";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, Edit, Trash2, User as UserIcon, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce

const BoardMembers = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageBoardMembers } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageBoardMembers: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageBoardMembers = currentUserPrivileges.includes("Manage Board Members");
    return { canManageBoardMembers };
  }, [currentUser, definedRoles]);

  const [boardMembers, setBoardMembers] = React.useState<BoardMember[]>([]);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<BoardMember | undefined>(undefined);
  const [deletingMemberId, setDeletingMemberId] = React.useState<string | undefined>(undefined);
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchBoardMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('board_members').select('*');

    if (debouncedSearchQuery) { // Use debounced query
      query = query.or(`name.ilike.%${debouncedSearchQuery}%,role.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%,phone.ilike.%${debouncedSearchQuery}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error("Error fetching board members:", error);
      setError("Failed to load board members.");
      showError("Failed to load board members.");
      setBoardMembers([]);
    } else {
      setBoardMembers(data || []);
    }
    setLoading(false);
  }, [debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchBoardMembers();
  }, [fetchBoardMembers]);

  const handleAddMember = async (newMemberData: Omit<BoardMember, 'id'>) => {
    const { data, error } = await supabase
      .from('board_members')
      .insert(newMemberData)
      .select()
      .single();

    if (error) {
      console.error("Error adding board member:", error);
      showError("Failed to add board member.");
    } else {
      showSuccess("Board member added successfully!");
      fetchBoardMembers(); // Re-fetch to update the list
    }
  };

  const handleEditMember = async (updatedMemberData: BoardMember) => {
    const { error } = await supabase
      .from('board_members')
      .update(updatedMemberData)
      .eq('id', updatedMemberData.id);

    if (error) {
      console.error("Error updating board member:", error);
      showError("Failed to update board member.");
    } else {
      showSuccess("Board member updated successfully!");
      fetchBoardMembers(); // Re-fetch to update the list
    }
  };

  const handleDeleteMember = async () => {
    if (deletingMemberId) {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', deletingMemberId);

      if (error) {
        console.error("Error deleting board member:", error);
        showError("Failed to delete board member.");
      } else {
        showSuccess("Board member deleted successfully!");
        setDeletingMemberId(undefined);
        fetchBoardMembers(); // Re-fetch to update the list
      }
    }
  };

  const openEditDialog = (member: BoardMember) => {
    setEditingMember(member);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (memberId: string) => {
    setDeletingMemberId(memberId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Board Members</h1>
        <p className="text-lg text-muted-foreground">Loading board members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Board Members</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Board Members</h1>
      <p className="text-lg text-muted-foreground">
        Manage the details of your organization's board members.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Board Member List</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search board members..."
                value={localSearchQuery} // Use local state for input
                onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            {canManageBoardMembers && (
              <Button onClick={() => { setEditingMember(undefined); setIsAddEditDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Board Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {boardMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Notes</TableHead>
                  {canManageBoardMembers && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {boardMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.image_url ? (
                        <img src={member.image_url} alt={member.name} className="h-32 w-32 rounded-full object-cover" /> {/* Increased size */}
                      ) : (
                        <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center"> {/* Increased size */}
                          <UserIcon className="h-16 w-16 text-muted-foreground" /> {/* Scaled icon */}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>{member.address || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{member.notes || "-"}</TableCell>
                    {canManageBoardMembers && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(member.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No board members found matching your search.</p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <AddEditBoardMemberDialog
        isOpen={isAddEditDialogOpen}
        setIsOpen={setIsAddEditDialogOpen}
        initialData={editingMember}
        onSave={editingMember ? handleEditMember : handleAddMember}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMemberId} onOpenChange={(open) => !open && setDeletingMemberId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the board member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BoardMembers;