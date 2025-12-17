"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SampleUser {
  name: string;
  email: string;
  password?: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended";
  enableLogin: boolean;
  imageUrl?: string;
}

const sampleUsers: SampleUser[] = [
  {
    name: "Super Admin User",
    email: "superadmin@example.com",
    password: "password123",
    role: "Super Admin",
    status: "Active",
    enableLogin: true,
    imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=SuperAdmin",
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "Admin",
    status: "Active",
    enableLogin: true,
    imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Admin",
  },
  {
    name: "Project Manager User",
    email: "projectmanager@example.com",
    password: "password123",
    role: "Project Manager",
    status: "Active",
    enableLogin: true,
    imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=ProjectManager",
  },
  {
    name: "Contributor User",
    email: "contributor@example.com",
    password: "password123",
    role: "Contributor",
    status: "Active",
    enableLogin: true,
    imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Contributor",
  },
];

const MigrateData: React.FC = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === "Super Admin";

  const handleMigrateUsers = async () => {
    if (!isSuperAdmin) {
      showError("You must be a Super Admin to perform this migration.");
      return;
    }

    const toastId = showLoading("Migrating sample users...");
    let successCount = 0;
    let failCount = 0;

    for (const user of sampleUsers) {
      try {
        // 1. Check if user already exists in auth.users
        const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1,
          email: user.email,
        });

        if (searchError) {
          console.error(`Error searching for user ${user.email}:`, searchError);
          failCount++;
          continue;
        }

        if (existingUsers?.users && existingUsers.users.length > 0) {
          // User exists in auth.users, update their profile
          const existingSupabaseUser = existingUsers.users[0];
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
              enable_login: user.enableLogin,
              image_url: user.imageUrl,
            })
            .eq('id', existingSupabaseUser.id);

          if (profileUpdateError) {
            console.error(`Error updating profile for existing user ${user.email}:`, profileUpdateError);
            failCount++;
          } else {
            successCount++;
          }
        } else {
          // User does not exist, create new user in auth.users
          const { data: newUserData, error: createUserError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              full_name: user.name,
              avatar_url: user.imageUrl,
              role: user.role, // Pass role to trigger function
              status: user.status, // Pass status to trigger function
              enable_login: user.enableLogin, // Pass enable_login to trigger function
            },
          });

          if (createUserError) {
            console.error(`Error creating user ${user.email}:`, createUserError);
            failCount++;
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Unexpected error during migration for user ${user.email}:`, err);
        failCount++;
      }
    }

    dismissToast(toastId);
    if (failCount === 0) {
      showSuccess(`Successfully migrated ${successCount} sample users!`);
    } else {
      showError(`Migration completed with ${successCount} successes and ${failCount} failures. Check console for details.`);
    }
    // Optionally, refresh the page or redirect after migration
    // navigate('/');
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Data Migration</h1>
        <p className="text-lg text-muted-foreground">Loading authentication status...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-lg text-destructive">You must be a Super Admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Data Migration</h1>
      <p className="text-lg text-muted-foreground">
        This page allows you to migrate sample user data to Supabase Auth and profiles.
        This is a one-time operation for initial setup.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Migrate Sample Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive">
            <span className="font-bold">Warning:</span> This action will create or update users in your Supabase
            authentication and profiles tables. Only run this once for initial setup.
          </p>
          <Button onClick={handleMigrateUsers}>
            Migrate Sample Users to Supabase
          </Button>
          <p className="text-sm text-muted-foreground">
            After running this, you can log in with the sample user credentials (e.g., superadmin@example.com / password123).
            Remember to remove this page and its route from the application after successful migration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrateData;