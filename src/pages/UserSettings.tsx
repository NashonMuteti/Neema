"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Assuming Switch component is available

const UserSettings = () => {
  // Placeholder for user data, will be replaced with actual user context
  const currentUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    receiveNotifications: true,
    themePreference: "system",
  };

  const [userName, setUserName] = React.useState(currentUser.name);
  const [userEmail, setUserEmail] = React.useState(currentUser.email);
  const [notifications, setNotifications] = React.useState(currentUser.receiveNotifications);

  const handleSaveSettings = () => {
    // In a real app, this would send updated settings to the backend
    console.log("Saving user settings:", { userName, userEmail, notifications });
    // showSuccess("Settings saved successfully!"); // Assuming a toast utility
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">My Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage your personal account information and preferences.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} disabled />
            <p className="text-sm text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <Button onClick={handleSaveSettings}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between w-full max-w-sm">
            <Label htmlFor="notifications">Receive Email Notifications</Label>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          {/* Theme preference is handled by the ThemeToggle in the header */}
          <Button onClick={handleSaveSettings}>Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;