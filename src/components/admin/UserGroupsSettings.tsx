"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Edit, Trash2, Users as UsersIcon } from "lucide-react";
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
import { showSuccess, showError } from "@/utils/toast";
import AddEditUserGroupDialog, { UserGroup } from "./AddEditUserGroupDialog";

// Dummy data for users (reusing from UserProfileSettingsAdmin)
interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member"; // Simplified role for display
}

const dummyUsers: User[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
  { id: "u2", name: "Bob Williams", email: "bob@example.com", role: "Member" },
  { id: "u3", name: "Charlie Brown", email: "charlie@example.com", role: "Member" },
  { id: "u4", name: "David Green", email: "david@example.com", role: "Member" },
];

const UserGroupsSettings = () => {
  const [userGroups, setUserGroups] = React.useState<UserGroup[]>([
    { id: "g1", name: "Administrators", description: "Full access to all features and settings.", memberUserIds: ["u1"] },
    { id: "g2", name: "Project Managers", description: "Can create and manage projects, view reports.", memberUserIds: ["u2"] },
    { id: "g3", name: "Contributors", description: "Can record contributions and view personal reports.", memberUserIds: ["u3", "u4"] },
  ]);
  const [isAddEditGroupDialogOpen, setIsAddEditGroupDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<UserGroup | undefined>(undefined);
  const [deletingGroupId, setDeletingGroupId] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredGroups = userGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveGroup = (groupData: Omit<UserGroup, 'id'> & { id?: string }) => {
    if (groupData.id) {
      // Edit existing group
      setUserGroups(prev => prev.map(g => g.id === groupData.id ? { ...g, ...groupData, id: g.id } : g));
    } else {
      // Add new group
      const newGroup: UserGroup = {
        ...groupData,
        id: `g${userGroups.length + 1}`, // Simple ID generation
        memberUserIds: [], // New groups start with no members
      };
      setUserGroups(prev => [...prev, newGroup]);
    }
  };

  const handleDeleteGroup = () => {
    if (deletingGroupId) {
      setUserGroups(prev => prev.filter(group => group.id !== deletingGroupId));
      showSuccess("User group deleted successfully!");
      setDeletingGroupId(undefined);
    }
  };

  const openEditDialog = (group: UserGroup) => {
    setEditingGroup(group);
    setIsAddEditGroupDialogOpen(true);
  };

  const openDeleteDialog = (groupId: string) => {
    setDeletingGroupId(groupId);
  };

  return (
    <div className="space-y-6">
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Manage User Groups</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button onClick={() => { setEditingGroup(undefined); setIsAddEditGroupDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Define groups to categorize users and manage their permissions collectively.
          </p>
          {filteredGroups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{group.description}</TableCell>
                    <TableCell className="text-center">{group.memberUserIds.length}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(group)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(group.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No user groups found matching your search.</p>
          )}
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Assign Users to Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            View which users belong to which groups. Actual assignment would require backend integration.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Group(s)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {userGroups
                      .filter(group => group.memberUserIds.includes(user.id))
                      .map(group => group.name)
                      .join(", ") || "No Group Assigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-4">
            Note: The ability to dynamically assign users to groups from this UI requires backend integration to persist changes.
          </p>
        </CardContent>
      </Card>

      <AddEditUserGroupDialog
        isOpen={isAddEditGroupDialogOpen}
        setIsOpen={setIsAddEditGroupDialogOpen}
        initialData={editingGroup}
        onSave={handleSaveGroup}
      />

      <AlertDialog open={!!deletingGroupId} onOpenChange={(open) => !open && setDeletingGroupId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserGroupsSettings;