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
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileUploadSchema } from "@/utils/security";

const BrandSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization");

  const { brandLogoUrl, tagline, setBrandLogoUrl, setTagline, isLoading: brandingLoading } = useBranding(); // Use the branding context
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(brandLogoUrl);
  const [localTagline, setLocalTagline] = React.useState(tagline);
  const [isSaving, setIsSaving] = React.useState(false);

  // Effect to update local state when context changes (for tagline and initial logo)
  React.useEffect(() => {
    setLocalTagline(tagline);
    // Only update localPreviewUrl from brandLogoUrl if no file is currently selected
    if (!selectedFile) {
      setLocalPreviewUrl(brandLogoUrl);
    }
  }, [brandLogoUrl, tagline, selectedFile]);

  // Effect to manage the blob URL lifecycle based on selectedFile
  React.useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setLocalPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl); // Revoke when selectedFile changes or component unmounts
    } else if (!brandLogoUrl) { // If no file selected and no global logo, ensure preview is null
      setLocalPreviewUrl(null);
    } else { // If no file selected but there's a global logo, use that
      setLocalPreviewUrl(brandLogoUrl);
    }
  }, [selectedFile, brandLogoUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        fileUploadSchema.parse(file);
        setSelectedFile(file); // This will trigger the useEffect above
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        event.target.value = "";
        return;
      }
    } else {
      setSelectedFile(null); // This will trigger the useEffect above
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    let newLogoUrl = brandLogoUrl;

    if (selectedFile) {
      const filePath = `brand-logos/logo_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const uploadedUrl = await uploadFileToSupabase('brand-logos', selectedFile, filePath);
      if (uploadedUrl) {
        newLogoUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    } else if (localPreviewUrl === null && brandLogoUrl !== "") {
      // If user cleared the selection and there was a previous logo, clear it
      newLogoUrl = "";
    }

    await setBrandLogoUrl(newLogoUrl);
    await setTagline(localTagline);
    
    showSuccess("Branding settings saved successfully!");
    setIsSaving(false);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Brand Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground mb-4">
          Customize your application's branding, including logo and tagline.
        </p>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="brand-logo-upload">Brand Logo</Label>
          <div className="flex items-center gap-4">
            {localPreviewUrl ? (
              <img src={localPreviewUrl} alt="Brand Logo Preview" className="w-24 h-24 object-contain rounded-md border" />
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
              disabled={!canManageAppCustomization || isSaving || brandingLoading}
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
            disabled={!canManageAppCustomization || isSaving || brandingLoading}
          />
          <p className="text-sm text-muted-foreground">This tagline appears in reports and footers.</p>
        </div>

        <Button onClick={handleSaveBranding} disabled={!canManageAppCustomization || isSaving || brandingLoading}>
          {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Brand Settings</>}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BrandSettings;