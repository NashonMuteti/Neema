"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
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
import { Search, Edit, Trash2, User as UserIcon, Eye, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member";
  status: "Active" | "Inactive" | "Suspended";
  imageUrl?: string;
}

const dummyUsers: User[] = [
  { id: "m1", name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Alice" },
  { id: "m2", name: "Bob Williams", email: "bob@example.com", role: "Member", status: "Active", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Bob" },
  { id: "m3", name: "Charlie Brown", email: "charlie@example.com", role: "Member", status: "Inactive", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Charlie" },
  { id: "m4", name: "David Green", email: "david@example.com", role: "Member", status: "Suspended", imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=David" },
];

const UserProfileSettingsAdmin = () => {
  const { isAdmin } = useAuth(); // Use the auth context
  const [users, setUsers] = React.useState<User[]>(dummyUsers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingUserId, setDeletingUserId] = React.useState<string | undefined>(undefined);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query)
    );
  });

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

  const handleEditUser = (userId: string) => {
    showSuccess(`Editing user ${userId} (placeholder).`);
    console.log("Edit user:", userId);
    // In a real app, this would open an edit dialog
  };

  const handleDeleteUser = () => {
    if (deletingUserId) {
      setUsers(prev => prev.filter(user => user.id !== deletingUserId));
      showSuccess("User deleted successfully!");
      setDeletingUserId(undefined);
    }
  };

  const openDeleteDialog = (userId: string) => {
    setDeletingUserId(userId);
  };

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
          {isAdmin && (
            <Button onClick={() => showSuccess("Add User functionality (placeholder).")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          As an administrator, you can view, edit, and manage other users' accounts, roles, and group permissions.
        </p>
        {filteredUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                <TableHead className="text-center">Contributions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
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
                  {isAdmin && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user.id)}>
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
                        <Eye className="h-4 w-4 mr-2" /> View
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
      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserProfileSettingsAdmin;