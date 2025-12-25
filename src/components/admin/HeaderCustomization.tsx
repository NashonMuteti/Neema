"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

const HeaderCustomization = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageHeaderCustomization = currentUserPrivileges.includes("Manage Header Customization");

  const { headerTitle, setHeaderTitle, isLoading: brandingLoading } = useBranding();
  const [localHeaderTitle, setLocalHeaderTitle] = React.useState(headerTitle);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalHeaderTitle(headerTitle);
  }, [headerTitle]);

  const handleSaveHeaderSettings = async () => {
    setIsSaving(true);
    await setHeaderTitle(localHeaderTitle);
    showSuccess("Header title updated successfully!");
    console.log("Saving header title:", localHeaderTitle);
    setIsSaving(false);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Header Customization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Customize the main title displayed in the application header.
        </p>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="header-title">Application Header Title</Label>
          <Input
            id="header-title"
            type="text"
            value={localHeaderTitle}
            onChange={(e) => setLocalHeaderTitle(e.target.value)}
            placeholder="Your App Title"
            disabled={!canManageHeaderCustomization || isSaving || brandingLoading}
          />
          <p className="text-sm text-muted-foreground">This title appears prominently in the application header.</p>
        </div>
        <Button onClick={handleSaveHeaderSettings} disabled={!canManageHeaderCustomization || isSaving || brandingLoading}>
          {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Header Settings</>}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HeaderCustomization;