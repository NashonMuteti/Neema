"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";

const SecuritySettings = () => {
  const { sessionTimeoutMinutes, setSessionTimeoutMinutes, isLoading: settingsLoading } = useSystemSettings();

  // MFA remains a UI-only placeholder for now
  const [mfaEnabled, setMfaEnabled] = React.useState(false);

  const [localSessionTimeout, setLocalSessionTimeout] = React.useState<string>(String(sessionTimeoutMinutes));
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalSessionTimeout(String(sessionTimeoutMinutes));
  }, [sessionTimeoutMinutes]);

  const handleSaveSecuritySettings = async () => {
    const minutes = Number(localSessionTimeout);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      showError("Session timeout must be a positive number of minutes.");
      return;
    }

    setIsSaving(true);
    await setSessionTimeoutMinutes(Math.floor(minutes));
    showSuccess("Security settings saved successfully!");
    setIsSaving(false);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">Configure authentication methods, password policies, and access controls.</p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mfa" className="text-sm font-medium">
              Enable Multi-Factor Authentication
            </Label>
            <Switch id="mfa" checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="session-timeout" className="text-sm font-medium">
              Session Timeout (minutes)
            </Label>
            <Input
              id="session-timeout"
              type="number"
              value={localSessionTimeout}
              onChange={(e) => setLocalSessionTimeout(e.target.value)}
              className="w-24 text-right"
              min="1"
              disabled={settingsLoading || isSaving}
            />
          </div>

          <Button onClick={handleSaveSecuritySettings} disabled={settingsLoading || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Security Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettings;