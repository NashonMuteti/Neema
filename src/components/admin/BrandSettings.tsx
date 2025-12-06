"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Image as ImageIcon, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const BrandSettings = () => {
  // In a real app, these would be fetched from a backend/global state
  const [brandLogoUrl, setBrandLogoUrl] = React.useState<string | undefined>("/placeholder.svg");
  const [tagline, setTagline] = React.useState("Your cinematic tagline here.");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(brandLogoUrl || null);

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
      setPreviewUrl(brandLogoUrl || null);
    }
  };

  const handleSaveBranding = () => {
    // In a real app, this would involve uploading the file and saving settings to a backend
    if (selectedFile && previewUrl) {
      // Simulate upload and update URL
      setBrandLogoUrl(previewUrl);
      showSuccess("Brand logo uploaded and settings saved!");
    } else {
      showSuccess("Branding settings saved!");
    }
    console.log("Saving brand settings:", { brandLogoUrl, tagline });
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
            />
          </div>
          <p className="text-sm text-muted-foreground">Upload a new logo image.</p>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="app-tagline">Application Tagline</Label>
          <Input
            id="app-tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Your cinematic tagline here."
          />
          <p className="text-sm text-muted-foreground">This tagline appears in reports and footers.</p>
        </div>

        <Button onClick={handleSaveBranding}>
          <Save className="mr-2 h-4 w-4" /> Save Brand Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default BrandSettings;