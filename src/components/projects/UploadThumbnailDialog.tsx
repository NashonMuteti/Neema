"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client

interface UploadThumbnailDialogProps {
  projectId: string;
  projectName: string;
  currentThumbnailUrl?: string;
  onThumbnailUpload: (projectId: string, newUrl: string) => void;
}

const UploadThumbnailDialog: React.FC<UploadThumbnailDialogProps> = ({
  projectId,
  projectName,
  currentThumbnailUrl,
  onThumbnailUpload,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageProjects } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageProjects: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageProjects = currentUserPrivileges.includes("Manage Projects");
    return { canManageProjects };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentThumbnailUrl || null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(currentThumbnailUrl || null);
    }
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, currentThumbnailUrl, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(currentThumbnailUrl || null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      showError("Please select an image to upload.");
      return;
    }

    // Simulate file upload to a backend/storage and get a URL
    // In a real application, you would send `selectedFile` to your backend
    // and receive a public URL for the uploaded image.
    const simulatedUploadUrl = URL.createObjectURL(selectedFile); // Using blob URL for immediate preview

    onThumbnailUpload(projectId, simulatedUploadUrl);
    showSuccess(`Thumbnail for '${projectName}' updated successfully!`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageProjects}>
          <ImageIcon className="mr-2 h-4 w-4" />
          {currentThumbnailUrl ? "Change Image" : "Upload Image"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentThumbnailUrl ? "Change Project Thumbnail" : "Upload Project Thumbnail"}</DialogTitle>
          <DialogDescription>
            Upload an image to represent your project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Thumbnail Preview" className="w-48 h-48 object-cover rounded-md border" />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="thumbnail-upload" className="text-center">Select Image</Label>
              <Input id="thumbnail-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={!canManageProjects} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={!selectedFile || !canManageProjects}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Actual image storage and serving require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UploadThumbnailDialog;