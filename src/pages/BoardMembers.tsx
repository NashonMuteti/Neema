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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddEditBoardMemberDialog, { BoardMember } from "@/components/board-members/AddEditBoardMemberDialog";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, Edit, Trash2, UserCog, User as UserIcon, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useUserRoles } from "@/context/UserRolesContext"; // New import

const BoardMembers = () => {
  const { currentUser } = useAuth(); // Use the auth context
  const { userRoles: definedRoles } = useUserRoles(); // Get all defined roles

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageBoardMembers = currentUserPrivileges.includes("Manage Board Members");

  const [boardMembers, setBoardMembers] = React.useState<BoardMember[]>([
    { id: "bm1", name: "Jane Doe", role: "Chairperson", email: "jane.doe@example.com", phone: "555-123-4567", address: "123 Main St, Anytown", notes: "Oversees strategic direction.", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Jane" },
    { id: "bm2", name: "Richard Roe", role: "Treasurer", email: "richard.roe@example.com", phone: "555-987-6543", notes: "Manages financial oversight.", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Richard" },
    { id: "bm3", name: "Emily White", role: "Secretary", email: "emily.white@example.com", phone: "555-111-2222", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Emily" },
  ]);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<BoardMember | undefined>(undefined);
  const [deletingMemberId, setDeletingMemberId] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredBoardMembers = boardMembers.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.phone.toLowerCase().includes(query)
    );
  });

  const handleAddMember = (newMemberData: Omit<BoardMember, 'id'>) => {
    const newMember: BoardMember = {
      id: `bm${boardMembers.length + 1}`, // Simple ID generation
      ...newMemberData,
      imageUrl: newMemberData.imageUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${newMemberData.name}`,
    };
    setBoardMembers((prev) => [...prev, newMember]);
  };

  const handleEditMember = (updatedMemberData: BoardMember) => {
    setBoardMembers((prev) =>
      prev.map((member) =>
        member.id === updatedMemberData.id ? updatedMemberData : member
      )
    );
  };

  const handleDeleteMember = () => {
    if (deletingMemberId) {
      setBoardMembers((prev) => prev.filter((member) => member.id !== deletingMemberId));
      showSuccess("Board member deleted successfully!");
      setDeletingMemberId(undefined);
    }
  };

  const openEditDialog = (member: BoardMember) => {
    setEditingMember(member);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (memberId: string) => {
    setDeletingMemberId(memberId);
  };

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            {canManageBoardMembers && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Board Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredBoardMembers.length > 0 ? (
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
                {filteredBoardMembers.map((member) => (
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

      {/* Add Member Dialog */}
      <AddEditBoardMemberDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onSave={handleAddMember}
      />

      {/* Edit Member Dialog */}
      {editingMember && (
        <AddEditBoardMemberDialog
          initialData={editingMember}
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onSave={handleEditMember}
        />
      )}

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