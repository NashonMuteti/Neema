"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecuritySettings from "@/components/admin/SecuritySettings";
import AppCustomization from "@/components/admin/AppCustomization";
import ReportsTemplateCustomization from "@/components/admin/ReportsTemplateCustomization";
import UserProfileSettingsAdmin from "@/components/admin/UserProfileSettingsAdmin"; // Placeholder for admin user settings
import SystemCurrencySettings from "@/components/admin/SystemCurrencySettings"; // Import the new component

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Admin Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage application-wide settings, security, customization, and user profiles.
      </p>

      <Tabs defaultValue="general" className="w-full"> {/* Changed default value to 'general' */}
        <TabsList className="grid w-full grid-cols-5"> {/* Increased grid columns */}
          <TabsTrigger value="general">General</TabsTrigger> {/* New tab */}
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="app-customization">App Customization</TabsTrigger>
          <TabsTrigger value="user-profiles">User Management</TabsTrigger>
          <TabsTrigger value="reports-templates">Reports Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="general"> {/* New tab content */}
          <SystemCurrencySettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="app-customization">
          <AppCustomization />
        </TabsContent>
        <TabsContent value="user-profiles">
          <UserProfileSettingsAdmin />
        </TabsContent>
        <TabsContent value="reports-templates">
          <ReportsTemplateCustomization />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;