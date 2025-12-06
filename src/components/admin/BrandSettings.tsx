"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Image as ImageIcon, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useBranding } from "@/context/BrandingContext"; // Import useBranding
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

const BrandSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization");

  const { brandLogoUrl, tagline, setBrandLogoUrl, setTagline } = useBranding(); // Use the branding context
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(brandLogoUrl);
  const [localTagline, setLocalTagline] = React.useState(tagline);

  React.useEffect(() => {
    // Update local state when context changes
    setPreviewUrl(brandLogoUrl);
    setLocalTagline(tagline);
  }, [brandLogoUrl, tagline]);

  React.useEffect(() => {
    // Cleanup object URL when component unmounts or file changes
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(brandLogoUrl); // Revert to current global logo if no file selected
    }
  };

  const handleSaveBranding = () => {
    if (selectedFile && previewUrl) {
      // Simulate upload and update global URL
      setBrandLogoUrl(previewUrl);
      showSuccess("Brand logo uploaded and settings saved!");
    } else if (!selectedFile && previewUrl !== brandLogoUrl) {
      // If user cleared selection and there was a previous logo, clear it
      setBrandLogoUrl(""); // Or set to a default empty state
      showSuccess("Brand logo cleared and settings saved!");
    } else {
      showSuccess("Branding settings saved!");
    }
    setTagline(localTagline); // Update global tagline
    console.log("Saving brand settings:", { brandLogoUrl: previewUrl, tagline: localTagline });
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Brand Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Customize your application's branding, including logo and tagline.
        </p>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="brand-logo-upload">Brand Logo</Label>
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Brand Logo Preview" className="w-24 h-24 object-contain rounded-md border" />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <Input
              id="brand-logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="flex-1"
              disabled={!canManageAppCustomization}
            />
          </div>
          <p className="text-sm text-muted-foreground">Upload a new logo image.</p>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="app-tagline">Application Tagline</Label>
          <Input
            id="app-tagline"
            type="text"
            value={localTagline}
            onChange={(e) => setLocalTagline(e.target.value)}
            placeholder="Your cinematic tagline here."
            disabled={!canManageAppCustomization}
          />
          <p className="text-sm text-muted-foreground">This tagline appears in reports and footers.</p>
        </div>

        <Button onClick={handleSaveBranding} disabled={!canManageAppCustomization}>
          <Save className="mr-2 h-4 w-4" /> Save Brand Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default BrandSettings;