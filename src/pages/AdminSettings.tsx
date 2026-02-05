"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecuritySettings from "@/components/admin/SecuritySettings";
import AppCustomization from "@/components/admin/AppCustomization";
import UserProfileSettingsAdmin from "@/components/admin/UserProfileSettingsAdmin";
import SystemCurrencySettings from "@/components/admin/SystemCurrencySettings";
import UserRolesSettings from "@/components/admin/UserRolesSettings";
import DatabaseUpdateSettings from "@/components/admin/DatabaseUpdateSettings";
import FinancialAccountsSettings from "@/components/admin/FinancialAccountsSettings";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

const AdminSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  // Get current user's role definition
  const currentUserRoleDefinition = definedRoles.find((role) => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];

  // Check specific privileges
  const canAccessAdminSettings =
    currentUserPrivileges.includes("Access Admin Settings") || currentUser?.role === "Super Admin";
  const canManageUserProfiles =
    currentUserPrivileges.includes("Manage User Profiles") || currentUser?.role === "Super Admin";
  const canManageUserRoles =
    currentUserPrivileges.includes("Manage User Roles") || currentUser?.role === "Super Admin";
  const canManageAppCustomization =
    currentUserPrivileges.includes("Manage App Customization") || currentUser?.role === "Super Admin";
  const canManageSystemCurrency =
    currentUserPrivileges.includes("Manage System Currency") || currentUser?.role === "Super Admin";
  const canManageSecurity =
    currentUserPrivileges.includes("Perform Admin Actions") || currentUser?.role === "Super Admin";
  const canManageDatabaseMaintenance =
    currentUserPrivileges.includes("Manage Database Maintenance") || currentUser?.role === "Super Admin";
  const canInitializeBalances =
    currentUserPrivileges.includes("Initialize Balances") || currentUser?.role === "Super Admin";
  const canManageFinancialAccounts =
    currentUserPrivileges.includes("Manage Financial Accounts") || currentUser?.role === "Super Admin";
  const canManageHeaderCustomization =
    currentUserPrivileges.includes("Manage Header Customization") || currentUser?.role === "Super Admin";

  // If user doesn't have access to admin settings, show a message
  if (!canAccessAdminSettings) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-lg text-muted-foreground">You do not have permission to access admin settings.</p>
      </div>
    );
  }

  // Determine which tabs to show based on privileges
  const tabsToShow: Array<{ value: string; label: string }> = [];
  if (canManageAppCustomization || canManageSystemCurrency || canManageFinancialAccounts || canManageHeaderCustomization) {
    tabsToShow.push({ value: "general", label: "General" });
  }
  if (canManageSecurity) {
    tabsToShow.push({ value: "security", label: "Security" });
  }
  if (canManageUserProfiles) {
    tabsToShow.push({ value: "user-management", label: "User Management" });
  }
  if (canManageUserRoles) {
    tabsToShow.push({ value: "user-roles", label: "User Roles" });
  }
  if (canManageDatabaseMaintenance || canInitializeBalances) {
    tabsToShow.push({ value: "maintenance", label: "Maintenance" });
  }

  // If no tabs are available, show a message
  if (tabsToShow.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-lg text-muted-foreground">You do not have permission to access any admin settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage application-wide settings, security, customization, and user profiles.
      </p>
      <Tabs defaultValue={tabsToShow[0]?.value} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          {tabsToShow.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-grow">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsToShow.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            {tab.value === "general" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {canManageAppCustomization && <AppCustomization />}
                </div>
                <div className="space-y-6">
                  {canManageSystemCurrency && <SystemCurrencySettings />}
                  {canManageFinancialAccounts && <FinancialAccountsSettings />}
                </div>
              </div>
            )}
            {tab.value === "security" && <SecuritySettings />}
            {tab.value === "user-management" && <UserProfileSettingsAdmin />}
            {tab.value === "user-roles" && <UserRolesSettings />}
            {tab.value === "maintenance" && <DatabaseUpdateSettings />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminSettings;