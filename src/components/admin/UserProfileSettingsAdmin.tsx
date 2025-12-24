"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, User as UserIcon, Eye, PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth, User } from "@/context/AuthContext";
import AddEditUserDialog from "./AddEditUserDialog";
import { useUserRoles } from "@/context/UserRolesContext";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const UserProfileSettingsAdmin = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const isSuperAdmin = currentUser?.role === "Super Admin";
  
  const { canManageUserProfiles } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageUserProfiles: false };
    }
    
    if (isSuperAdmin) {
      return { canManageUserProfiles: true };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageUserProfiles = currentUserPrivileges.includes("Manage User Profiles");
    
    return { canManageUserProfiles };
  }, [currentUser, definedRoles, isSuperAdmin]);

  const [users, setUsers] = React.useState<User[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingUserId, setDeletingUserId] = React.useState<string | undefined>(undefined);
  const [isAddEditUserDialogOpen, setIsAddEditUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase.from('profiles').select('*');
    
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users.");
      showError("Failed to load users.");
      setUsers([]);
    } else {
      setUsers(data.map(p => ({
        id: p.id,
        name: p.name || p.email || "Unknown",
        email: p.email || "N/A",
        role: p.role || "Contributor",
        status: p.status as "Active" | "Inactive" | "Suspended",
        enableLogin: p.enable_login ?? false,
        imageUrl: p.image_url || undefined,
        receiveNotifications: p.receive_notifications ?? true,
      })));
    }
    
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleAddUser = () => {
    setEditingUser(undefined);
    setIsAddEditUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsAddEditUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (deletingUserId) {
      // Use the RPC function to delete the user, which now handles both auth.users and public.profiles
      const { error } = await supabase.rpc('delete_user_by_id', { user_id_to_delete: deletingUserId });
      
      if (error) {
        console.error("Error deleting user:", error);
        showError(`Failed to delete user: ${error.message}`);
      } else {
        showSuccess("User deleted successfully!");
        setDeletingUserId(undefined);
        fetchUsers();
      }
    }
  };

  const openDeleteDialog = (userId: string) => {
    setDeletingUserId(userId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-lg text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">User Management</CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <Input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-8" 
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
          {canManageUserProfiles && (
            <Button onClick={handleAddUser}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          As an administrator, you can view, edit, and manage other users' accounts, roles, and group permissions.
        </p>
        {users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Login</TableHead>
                {canManageUserProfiles && <TableHead className="text-center">Actions</TableHead>}
                <TableHead className="text-center">Contributions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.imageUrl ? (
                      <img src={user.imageUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeClasses(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {user.enableLogin ? "Enabled" : "Disabled"}
                  </TableCell>
                  {canManageUserProfiles && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Link to={`/members/${user.id}/contributions`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center mt-4">No users found matching your search.</p>
        )}
      </CardContent>
      
      <AddEditUserDialog 
        isOpen={isAddEditUserDialogOpen} 
        setIsOpen={setIsAddEditUserDialogOpen} 
        initialData={editingUser} 
        onSave={handleSaveUser}
        availableRoles={definedRoles}
      />
      
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserProfileSettingsAdmin;