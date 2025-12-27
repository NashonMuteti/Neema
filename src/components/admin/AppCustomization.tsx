"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandSettings from "./BrandSettings";
import HeaderCustomization from "./HeaderCustomization"; // New import
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useTheme } from "next-themes"; // Import useTheme
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

const AppCustomization = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { defaultTheme: persistedDefaultTheme, setDefaultTheme, isLoading: settingsLoading } = useSystemSettings();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization");

  const { setTheme } = useTheme(); // Get current theme setter from next-themes
  const [localDefaultTheme, setLocalDefaultTheme] = React.useState<string>(persistedDefaultTheme); // State for the default theme setting
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    // When the component mounts or persistedDefaultTheme changes, update local state
    setLocalDefaultTheme(persistedDefaultTheme);
  }, [persistedDefaultTheme]);

  const handleSaveDefaultTheme = async () => {
    setIsSaving(true);
    await setDefaultTheme(localDefaultTheme); // Persist to Supabase via context
    setTheme(localDefaultTheme); // Also apply to next-themes immediately
    showSuccess(`Default theme set to '${localDefaultTheme}' successfully!`);
    console.log("Saving default theme:", localDefaultTheme);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Application Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Adjust the application's default theme.
          </p>
          <div className="grid w-full items-center gap-1.5"> {/* Removed max-w-sm */}
            <Label htmlFor="default-theme">Default Application Theme</Label>
            <Select value={localDefaultTheme} onValueChange={setLocalDefaultTheme} disabled={!canManageAppCustomization || isSaving || settingsLoading}>
              <SelectTrigger id="default-theme">
                <SelectValue placeholder="Select default theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Themes</SelectLabel>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="blue">Blue Theme</SelectItem>
                  <SelectItem value="green">Green Theme</SelectItem>
                  <SelectItem value="purple">Purple Theme</SelectItem>
                  <SelectItem value="orange">Orange Theme</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This sets the default theme for users who haven't chosen one.
            </p>
          </div>
          <Button onClick={handleSaveDefaultTheme} disabled={!canManageAppCustomization || isSaving || settingsLoading}>
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Default Theme</>}
          </Button>
        </CardContent>
      </Card>
      <BrandSettings />
      <HeaderCustomization />
    </div>
  );
};

export default AppCustomization;