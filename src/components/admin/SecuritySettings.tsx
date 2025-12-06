"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { showSuccess } from "@/utils/toast";

const SecuritySettings = () => {
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [sessionTimeout, setSessionTimeout] = React.useState("60");

  const handleSaveSecuritySettings = () => {
    // In a real app, this would send the settings to the backend
    console.log("Saving security settings:", { mfaEnabled, sessionTimeout });
    showSuccess("Security settings saved successfully!");
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Configure authentication methods, password policies, and access controls.
        </p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mfa" className="text-sm font-medium">Enable Multi-Factor Authentication</Label>
            <Switch
              id="mfa"
              checked={mfaEnabled}
              onCheckedChange={setMfaEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="session-timeout" className="text-sm font-medium">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="w-24 text-right"
              min="1"
            />
          </div>
          <Button onClick={handleSaveSecuritySettings}>
            <Save className="mr-2 h-4 w-4" /> Save Security Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettings;