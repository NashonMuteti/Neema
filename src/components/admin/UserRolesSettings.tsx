"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Edit, Trash2, Users as UsersIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import AddEditUserRoleDialog, { UserRole } from "./AddEditUserRoleDialog";
import { useUserRoles } from "@/context/UserRolesContext";
import { useAuth, User } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const UserRolesSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles, addRole, updateRole, deleteRole, fetchRoles } = useUserRoles();
  
  // Check if user is Super Admin
  const isSuperAdmin = currentUser?.role === "Super Admin";
  
  const currentUserRoleDefinition = userRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  
  // Super Admin can manage user roles
  const canManageUserRoles = isSuperAdmin || currentUserPrivileges.includes("Manage User Roles");

  const [isAddEditRoleDialogOpen, setIsAddEditRoleDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<UserRole | undefined>(undefined);
  const [deletingRoleId, setDeletingRoleId] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [roleMemberCounts, setRoleMemberCounts] = useState<Record<string, number>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .order('name', { ascending: true });
      
    if (error) {
      console.error("Error fetching all users:", error);
      showError("Failed to load users for role assignment.");
      setAllUsers([]);
    } else {
      setAllUsers(data.map(p => ({
        id: p.id,
        name: p.name || p.email || "Unknown",
        email: p.email || "N/A",
        role: p.role || "Contributor",
        status: "Active",
        enableLogin: true,
      })));
    }
    
    setLoadingUsers(false);
  }, []);

  const fetchRoleMemberCounts = useCallback(async () => {
    setLoadingCounts(true);
    const counts: Record<string, number> = {};
    
    for (const role of userRoles) {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', role.name);
        
      if (error) {
        console.error(`Error fetching count for role ${role.name}:`, error);
        counts[role.name] = 0;
      } else {
        counts[role.name] = count || 0;
      }
    }
    
    setRoleMemberCounts(counts);
    setLoadingCounts(false);
  }, [userRoles]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    if (userRoles.length > 0) {
      fetchRoleMemberCounts();
    }
  }, [userRoles, fetchRoleMemberCounts]);

  const filteredRoles = userRoles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRole = async (roleData: Omit<UserRole, 'id'> & { id?: string }) => {
    if (roleData.id) {
      await updateRole(roleData as UserRole);
      showSuccess("User role updated successfully!");
    } else {
      await addRole(roleData);
      showSuccess("User role added successfully!");
    }
    
    setIsAddEditRoleDialogOpen(false);
    fetchRoles();
  };

  const handleDeleteRole = async () => {
    if (deletingRoleId) {
      await deleteRole(deletingRoleId);
      setDeletingRoleId(undefined);
      fetchRoles();
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
              <Button onClick={() => {
                setEditingRole(undefined);
                setIsAddEditRoleDialogOpen(true);
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Role
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
                    <TableCell className="text-center">
                      {loadingCounts ? "..." : roleMemberCounts[role.name] || 0}
                    </TableCell>
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
      
      {/* Removed the "Assign Users to Roles" card as requested */}
      
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
              This action cannot be undone. This will permanently delete the user role. If there are users assigned to this role, you must reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRole} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRolesSettings;