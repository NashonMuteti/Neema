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
import DatabaseUpdateSettings from "@/components/admin/DatabaseUpdateSettings"; // New import

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage application-wide settings, security, customization, and user profiles.
      </p>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-8"> {/* Increased grid-cols to accommodate new tab */}
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="app-customization">App Customization</TabsTrigger>
          <TabsTrigger value="member-fields">Member Fields</TabsTrigger>
          <TabsTrigger value="user-profiles">User Management</TabsTrigger>
          <TabsTrigger value="user-roles">User Roles</TabsTrigger>
          <TabsTrigger value="reports-templates">Reports Templates</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger> {/* New tab trigger */}
        </TabsList>
        <TabsContent value="general">
          <SystemCurrencySettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="app-customization">
          <AppCustomization />
        </TabsContent>
        <TabsContent value="member-fields">
          <MemberFieldCustomization />
        </TabsContent>
        <TabsContent value="user-profiles">
          <UserProfileSettingsAdmin />
        </TabsContent>
        <TabsContent value="user-roles">
          <UserRolesSettings />
        </TabsContent>
        <TabsContent value="reports-templates">
          <ReportsTemplateCustomization />
        </TabsContent>
        <TabsContent value="maintenance"> {/* New tab content */}
          <DatabaseUpdateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;