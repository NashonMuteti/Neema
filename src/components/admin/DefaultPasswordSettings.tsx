"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

const DefaultPasswordSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageDefaultPassword = currentUserPrivileges.includes("Manage Default Password");

  // In a real application, this would be fetched from a backend setting
  const [defaultPassword, setDefaultPassword] = React.useState(""); // Start empty, as it's a configurable setting

  const handleSaveDefaultPassword = () => {
    if (!defaultPassword.trim()) {
      showError("Default password cannot be empty.");
      return;
    }
    // In a real app, this would send the defaultPassword to the backend
    // to be stored securely (e.g., in Supabase secrets or a configuration table).
    console.log("Saving system default password:", defaultPassword);
    showSuccess("System default password saved successfully!");
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Default Password Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Set a default password that can be used when creating new user accounts with login enabled,
          if no specific password is provided.
        </p>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="default-password">System Default Password</Label>
          <Input
            id="default-password"
            type="password"
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            placeholder="Enter default password"
            disabled={!canManageDefaultPassword}
          />
        </div>
        <Button onClick={handleSaveDefaultPassword} disabled={!canManageDefaultPassword}>
          <Save className="mr-2 h-4 w-4" /> Save Default Password
        </Button>
      </CardContent>
    </Card>
  );
};

export default DefaultPasswordSettings;