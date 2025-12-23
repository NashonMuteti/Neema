"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Database, Upload, Download } from "lucide-react"; // Added Upload and Download icons
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

const DatabaseUpdateSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageDatabaseMaintenance } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageDatabaseMaintenance: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageDatabaseMaintenance = currentUserPrivileges.includes("Manage Database Maintenance");
    return { canManageDatabaseMaintenance };
  }, [currentUser, definedRoles]);

  const handleCheckAndUpdateDatabase = () => {
    showError("Database field checks and updates require backend implementation.");
    console.log("Attempted to check and update database fields (requires backend).");
  };

  const handleBackupDatabase = () => {
    showError("Database backup functionality requires backend implementation.");
    console.log("Attempted to initiate database backup (requires backend).");
  };

  const handleRestoreDatabase = () => {
    showError("Database restore functionality requires backend implementation.");
    console.log("Attempted to initiate database restore (requires backend).");
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Database Maintenance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Perform critical database operations to ensure system stability and data recovery.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCheckAndUpdateDatabase} variant="outline" disabled={!canManageDatabaseMaintenance}>
            <Database className="mr-2 h-4 w-4" /> Check & Update Fields
          </Button>
          <Button onClick={handleBackupDatabase} variant="secondary" disabled={!canManageDatabaseMaintenance}>
            <Download className="mr-2 h-4 w-4" /> Backup Database
          </Button>
          <Button onClick={handleRestoreDatabase} variant="destructive" disabled={!canManageDatabaseMaintenance}>
            <Upload className="mr-2 h-4 w-4" /> Restore Database
          </Button>
        </div>
        <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive">
          <span className="font-bold">Note:</span> These operations require secure backend integration (e.g., Supabase Edge Functions or a custom API) and cannot be performed directly from the client-side.
        </p>
      </CardContent>
    </Card>
  );
};

export default DatabaseUpdateSettings;