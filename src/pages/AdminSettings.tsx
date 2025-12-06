"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecuritySettings from "@/components/admin/SecuritySettings";
import AppCustomization from "@/components/admin/AppCustomization";
import ReportsTemplateCustomization from "@/components/admin/ReportsTemplateCustomization";
import UserProfileSettingsAdmin from "@/components/admin/UserProfileSettingsAdmin"; // Placeholder for admin user settings
import SystemCurrencySettings from "@/components/admin/SystemCurrencySettings"; // Import the new component
import ClearSampleDataDialog from "@/components/admin/ClearSampleDataDialog"; // Import the new dialog
import { showSuccess } from "@/utils/toast";

const AdminSettings = () => {
  const handleClearData = (selectedTables: string[]) => {
    // In a real application, this would trigger a backend function
    // to clear data from the specified tables.
    console.log("Attempting to clear data from tables:", selectedTables);
    showSuccess(`Request to clear data from ${selectedTables.length} tables sent.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage application-wide settings, security, customization, and user profiles.
      </p>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="app-customization">App Customization</TabsTrigger>
          <TabsTrigger value="user-profiles">User Management</TabsTrigger>
          <TabsTrigger value="reports-templates">Reports Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-6"> {/* Added space-y-6 for spacing */}
          <SystemCurrencySettings />
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage and clear sample data from your database. Use with caution.
              </p>
              <ClearSampleDataDialog onClearData={handleClearData} />
            </CardContent>
          </Card>
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