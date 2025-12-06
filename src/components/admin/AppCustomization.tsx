"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandSettings from "./BrandSettings";
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

const AppCustomization = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization");

  const { theme, setTheme } = useTheme(); // Get current theme and setter
  const [defaultTheme, setDefaultTheme] = React.useState<string>(theme || "system"); // State for the default theme setting

  React.useEffect(() => {
    // When the component mounts, set the local state to the current theme from next-themes
    // In a real app, this would likely be fetched from a backend setting
    setDefaultTheme(theme || "system");
  }, [theme]);

  const handleSaveDefaultTheme = () => {
    // In a real application, this would save the 'defaultTheme' to a backend
    // For now, we'll just apply it immediately and show a toast.
    setTheme(defaultTheme);
    showSuccess(`Default theme set to '${defaultTheme}' successfully!`);
    console.log("Saving default theme:", defaultTheme);
  };

  return (
    <div className="space-y-6">
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>App Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Adjust the application's look and feel, branding, and default behaviors.
          </p>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="default-theme">Default Application Theme</Label>
            <Select value={defaultTheme} onValueChange={setDefaultTheme} disabled={!canManageAppCustomization}>
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
          <Button onClick={handleSaveDefaultTheme} disabled={!canManageAppCustomization}>
            <Save className="mr-2 h-4 w-4" /> Save Default Theme
          </Button>
        </CardContent>
      </Card>
      <BrandSettings />
    </div>
  );
};

export default AppCustomization;