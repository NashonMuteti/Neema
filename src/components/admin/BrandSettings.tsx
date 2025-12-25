"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Image as ImageIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileUploadSchema } from "@/utils/security";

const BrandSettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageAppCustomization = currentUserPrivileges.includes("Manage App Customization");

  const { brandLogoUrl, tagline, setBrandLogoUrl, setTagline, isLoading: brandingLoading } = useBranding();
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null); // State for the blob URL
  const [localTagline, setLocalTagline] = React.useState(tagline);
  const [isSaving, setIsSaving] = React.useState(false);

  // Effect to update local tagline when context changes
  React.useEffect(() => {
    setLocalTagline(tagline);
  }, [tagline]);

  // Effect to create and revoke blob URL
  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setBlobUrl(null); // Clear blobUrl on cleanup
      };
    } else {
      setBlobUrl(null); // Clear blobUrl if no file is selected
    }
  }, [selectedFile]);

  // Determine the URL to display: blobUrl if present, otherwise brandLogoUrl
  const displayImageUrl = blobUrl || brandLogoUrl || null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        fileUploadSchema.parse(file);
        setSelectedFile(file);
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        event.target.value = "";
        setSelectedFile(null); // Clear selected file on error
      }
    } else {
      setSelectedFile(null);
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
    } else if (!selectedFile && brandLogoUrl && !blobUrl) { // If no new file, but there was an old one, and no blobUrl (meaning user cleared it)
      newLogoUrl = ""; // Clear the logo
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
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="Brand Logo Preview" className="w-24 h-24 object-contain rounded-md border" />
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