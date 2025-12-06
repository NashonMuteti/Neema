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
import AddEditUserRoleDialog, { UserRole } from "./AddEditUserRoleDialog";
import { useUserRoles } from "@/context/UserRolesContext"; // Import useUserRoles
import { useAuth } from "@/context/AuthContext"; // New import

// Dummy data for users (reusing from UserProfileSettingsAdmin)
interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Updated to string to support custom roles
}

const dummyUsers: User[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
  { id: "u2", name: "Bob Williams", email: "bob@example.com", role: "Project Manager" },
  { id: "u3", name: "Charlie Brown", email: "charlie@example.com", role: "Contributor" },
  { id: "u4", name: "David Green", email: "david@example.com", role: "Contributor" },
];

const UserRolesSettings = () => {
  const { currentUser } = useAuth(); // Use the auth context
  const { userRoles, addRole, updateRole, deleteRole } = useUserRoles(); // Use context

  const currentUserRoleDefinition = userRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageUserRoles = currentUserPrivileges.includes("Manage User Roles");

  const [isAddEditRoleDialogOpen, setIsAddEditRoleDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<UserRole | undefined>(undefined);
  const [deletingRoleId, setDeletingRoleId] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredRoles = userRoles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRole = (roleData: Omit<UserRole, 'id'> & { id?: string }) => {
    if (roleData.id) {
      // Edit existing role
      updateRole(roleData as UserRole); // Cast to UserRole as it now has an ID
    } else {
      // Add new role
      addRole(roleData);
    }
  };

  const handleDeleteRole = () => {
    if (deletingRoleId) {
      deleteRole(deletingRoleId);
      showSuccess("User role deleted successfully!");
      setDeletingRoleId(undefined);
    }
  };

  const openEditDialog = (role: UserRole) => {
    setEditingRole(role);
    setIsAddEditRoleDialogOpen(true);
  };

  const openDeleteDialog = (roleId: string) => {
    setDeletingRoleId(roleId);
  };

  return (
    <div className="space-y-6">
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Manage User Roles</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            {canManageUserRoles && (
              <Button onClick={() => { setEditingRole(undefined); setIsAddEditRoleDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Define roles to categorize users and manage their permissions collectively.
          </p>
          {filteredRoles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  {canManageUserRoles && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{role.description}</TableCell>
                    <TableCell className="text-center">{role.memberUserIds.length}</TableCell>
                    {canManageUserRoles && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(role.id)}>
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
            <p className="text-muted-foreground text-center mt-4">No user roles found matching your search.</p>
          )}
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Assign Users to Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            View which users belong to which roles. Actual assignment would require backend integration.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Role(s)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {userRoles
                      .filter(role => role.memberUserIds.includes(user.id))
                      .map(role => role.name)
                      .join(", ") || "No Role Assigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-4">
            Note: The ability to dynamically assign users to roles from this UI requires backend integration to persist changes.
          </p>
        </CardContent>
      </Card>

      <AddEditUserRoleDialog
        isOpen={isAddEditRoleDialogOpen}
        setIsOpen={setIsAddEditRoleDialogOpen}
        initialData={editingRole}
        onSave={handleSaveRole}
      />

      <AlertDialog open={!!deletingRoleId} onOpenChange={(open) => !open && setDeletingRoleId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRolesSettings;