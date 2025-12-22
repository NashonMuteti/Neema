"use client";
import React, { useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecuritySettings from "@/components/admin/SecuritySettings";
import AppCustomization from "@/components/admin/AppCustomization";
import ReportsTemplateCustomization from "@/components/admin/ReportsTemplateCustomization";
import UserProfileSettingsAdmin from "@/components/admin/UserProfileSettingsAdmin";
import SystemCurrencySettings from "@/components/admin/SystemCurrencySettings";
import MemberFieldCustomization from "@/components/admin/MemberFieldCustomization";
import UserRolesSettings from "@/components/admin/UserRolesSettings";
import DatabaseUpdateSettings from "@/components/admin/DatabaseUpdateSettings";
import DefaultPasswordSettings from "@/components/admin/DefaultPasswordSettings";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

const AdminSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  // Get current user's role definition
  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  
  // Centralized privilege check function
  const hasPrivilege = useCallback((privilege: string) => {
    return currentUser?.role === "Super Admin" || currentUserPrivileges.includes(privilege);
  }, [currentUser, currentUserPrivileges]);

  // Define all possible tabs and their required privileges
  const allAdminTabs = [
    {
      value: "general",
      label: "General",
      component: () => (
        <>
          {hasPrivilege("Manage System Currency") && <SystemCurrencySettings />}
        </>
      ),
      requiredAnyPrivilege: ["Manage System Currency"],
    },
    {
      value: "security",
      label: "Security",
      component: () => (
        <>
          {hasPrivilege("Perform Admin Actions") && <SecuritySettings />}
          {hasPrivilege("Manage Default Password") && <DefaultPasswordSettings />}
        </>
      ),
      requiredAnyPrivilege: ["Perform Admin Actions", "Manage Default Password"],
    },
    {
      value: "app-customization",
      label: "App Customization",
      component: () => <AppCustomization />,
      requiredAnyPrivilege: ["Manage App Customization"],
    },
    {
      value: "member-fields",
      label: "Member Fields",
      component: () => <MemberFieldCustomization />,
      requiredAnyPrivilege: ["Manage Member Fields"],
    },
    {
      value: "user-profiles",
      label: "User Management",
      component: () => <UserProfileSettingsAdmin />,
      requiredAnyPrivilege: ["Manage User Profiles"],
    },
    {
      value: "user-roles",
      label: "User Roles",
      component: () => <UserRolesSettings />,
      requiredAnyPrivilege: ["Manage User Roles"],
    },
    {
      value: "reports-templates",
      label: "Reports Templates",
      component: () => <ReportsTemplateCustomization />,
      requiredAnyPrivilege: ["Manage Reports Templates"],
    },
    {
      value: "maintenance",
      label: "Maintenance",
      component: () => <DatabaseUpdateSettings />, // InitializeBalances is a separate page
      requiredAnyPrivilege: ["Manage Database Maintenance", "Initialize Balances"],
    },
  ];

  // Filter tabs based on user privileges
  const accessibleTabs = useMemo(() => {
    return allAdminTabs.filter(tab =>
      tab.requiredAnyPrivilege.some(priv => hasPrivilege(priv))
    );
  }, [allAdminTabs, hasPrivilege]);

  // If user doesn't have access to admin settings, show a message
  if (!hasPrivilege("Access Admin Settings") && !hasPrivilege("Perform Admin Actions")) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-lg text-muted-foreground">
          You do not have permission to access admin settings.
        </p>
      </div>
    );
  }
  
  // If no tabs are available, show a message
  if (accessibleTabs.length === 0) {
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
      <Tabs defaultValue={accessibleTabs[0]?.value} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {accessibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {accessibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            {tab.component()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminSettings;