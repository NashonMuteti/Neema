"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecuritySettings from "@/components/admin/SecuritySettings";
import AppCustomization from "@/components/admin/AppCustomization";
import ReportsTemplateCustomization from "@/components/admin/ReportsTemplateCustomization";
import UserProfileSettingsAdmin from "@/components/admin/UserProfileSettingsAdmin";
import SystemCurrencySettings from "@/components/admin/SystemCurrencySettings";
import MemberFieldCustomization from "@/components/admin/MemberFieldCustomization";
import UserRolesSettings from "@/components/admin/UserRolesSettings";
import DatabaseUpdateSettings from "@/components/admin/DatabaseUpdateSettings";
import FinancialAccountsSettings from "@/components/admin/FinancialAccountsSettings"; // New import
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

const AdminSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  // Get current user's role definition
  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  
  // Check specific privileges
  const canAccessAdminSettings = currentUserPrivileges.includes("Access Admin Settings") || 
                                currentUser?.role === "Super Admin";
  const canManageUserProfiles = currentUserPrivileges.includes("Manage User Profiles") || 
                               currentUser?.role === "Super Admin";
  const canManageUserRoles = currentUserPrivileges.includes("Manage User Roles") || 
                            currentUser?.role === "Super Admin";
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization") || 
                                   currentUser?.role === "Super Admin";
  const canManageSystemCurrency = currentUserPrivileges.includes("Manage System Currency") || 
                                 currentUser?.role === "Super Admin";
  const canManageMemberFields = currentUserPrivileges.includes("Manage Member Fields") || 
                                currentUser?.role === "Super Admin";
  const canManageReportsTemplates = currentUserPrivileges.includes("Manage Reports Templates") || 
                                    currentUser?.role === "Super Admin";
  const canManageSecurity = currentUserPrivileges.includes("Perform Admin Actions") || 
                           currentUser?.role === "Super Admin";
  const canManageDatabaseMaintenance = currentUserPrivileges.includes("Manage Database Maintenance") || 
                                      currentUser?.role === "Super Admin";
  const canInitializeBalances = currentUserPrivileges.includes("Initialize Balances") || 
                               currentUser?.role === "Super Admin";
  const canManageFinancialAccounts = currentUserPrivileges.includes("Manage Financial Accounts") ||
                                     currentUser?.role === "Super Admin"; // New privilege check
  
  // --- START DEBUG LOGS ---
  console.log("AdminSettings Debug:");
  console.log("  currentUser.role:", currentUser?.role);
  console.log("  currentUserPrivileges (from role definition):", currentUserPrivileges);
  console.log("  canAccessAdminSettings:", canAccessAdminSettings);
  console.log("  canManageUserProfiles:", canManageUserProfiles);
  console.log("  canManageUserRoles:", canManageUserRoles);
  console.log("  canManageAppCustomization:", canManageAppCustomization);
  console.log("  canManageSystemCurrency:", canManageSystemCurrency);
  console.log("  canManageMemberFields:", canManageMemberFields);
  console.log("  canManageReportsTemplates:", canManageReportsTemplates);
  console.log("  canManageSecurity:", canManageSecurity);
  console.log("  canManageDatabaseMaintenance:", canManageDatabaseMaintenance);
  console.log("  canInitializeBalances:", canInitializeBalances);
  console.log("  canManageFinancialAccounts:", canManageFinancialAccounts); // New debug log
  // --- END DEBUG LOGS ---

  // If user doesn't have access to admin settings, show a message
  if (!canAccessAdminSettings) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-lg text-muted-foreground">
          You do not have permission to access admin settings.
        </p>
      </div>
    );
  }
  
  // Determine which tabs to show based on privileges
  const tabsToShow = [];
  if (canManageAppCustomization || canManageSystemCurrency || canManageFinancialAccounts) { // Updated condition
    tabsToShow.push({ value: "general", label: "General" });
  }
  if (canManageSecurity) {
    tabsToShow.push({ value: "security", label: "Security" });
  }
  if (canManageMemberFields) {
    tabsToShow.push({ value: "member-fields", label: "Member Fields" });
  }
  if (canManageUserProfiles) {
    tabsToShow.push({ value: "user-management", label: "User Management" });
  }
  if (canManageUserRoles) {
    tabsToShow.push({ value: "user-roles", label: "User Roles" });
  }
  if (canManageReportsTemplates) {
    tabsToShow.push({ value: "reports-templates", label: "Reports Templates" });
  }
  if (canManageDatabaseMaintenance || canInitializeBalances) {
    tabsToShow.push({ value: "maintenance", label: "Maintenance" });
  }
  
  // If no tabs are available, show a message
  if (tabsToShow.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-lg text-muted-foreground">
          You do not have permission to access any admin settings.
        </p>
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
        <TabsList className="flex flex-wrap h-auto p-1 gap-1"> {/* Adjusted for responsiveness */}
          {tabsToShow.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-grow">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsToShow.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            {tab.value === "general" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> {/* New grid layout */}
                {canManageAppCustomization && <AppCustomization />}
                {canManageSystemCurrency && <SystemCurrencySettings />}
                {canManageFinancialAccounts && <FinancialAccountsSettings />} {/* New component */}
              </div>
            )}
            {tab.value === "security" && <SecuritySettings />}
            {tab.value === "member-fields" && <MemberFieldCustomization />}
            {tab.value === "user-management" && <UserProfileSettingsAdmin />}
            {tab.value === "user-roles" && <UserRolesSettings />}
            {tab.value === "reports-templates" && <ReportsTemplateCustomization />}
            {tab.value === "maintenance" && <DatabaseUpdateSettings />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminSettings;