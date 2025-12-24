"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { fileUploadSchema } from "@/utils/security";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";

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
  const [isSaving, setIsSaving] = React.useState(false);

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
      try {
        fileUploadSchema.parse(file);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        event.target.value = "";
        return;
      }
    } else {
      setSelectedFile(null);
      setPreviewUrl(currentThumbnailUrl || null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Please select an image to upload.");
      return;
    }
    
    try {
      fileUploadSchema.parse(selectedFile);
    } catch (error) {
      console.error("File validation error:", error);
      showError("Invalid file. Please upload an image file less than 5MB.");
      return;
    }
    
    setIsSaving(true);
    // Fetch project details to get the profile_id
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('profile_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData?.profile_id) {
      console.error("Error fetching project profile_id:", projectError);
      showError("Failed to get project owner information for upload.");
      setIsSaving(false);
      return;
    }

    const projectOwnerProfileId = projectData.profile_id;

    const filePath = `project-thumbnails/${projectOwnerProfileId}/${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
    const uploadedUrl = await uploadFileToSupabase('project-thumbnails', selectedFile, filePath);

    if (uploadedUrl) {
      const { error: dbUpdateError } = await supabase
        .from('projects')
        .update({ thumbnail_url: uploadedUrl })
        .eq('id', projectId);

      if (dbUpdateError) {
        console.error("Error updating project thumbnail URL in DB:", dbUpdateError);
        showError("Failed to update project thumbnail in database.");
        setIsSaving(false);
        return;
      }

      onThumbnailUpload(projectId, uploadedUrl);
      showSuccess(`Thumbnail for '${projectName}' updated successfully!`);
      setIsOpen(false);
    } else {
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
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
              <img
                src={previewUrl}
                alt="Thumbnail Preview"
                className="w-48 h-48 object-cover rounded-md border"
              />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="thumbnail-upload" className="text-center">
                Select Image
              </Label>
              <Input
                id="thumbnail-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={!canManageProjects || isSaving}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleUpload} disabled={!selectedFile || !canManageProjects || isSaving}>
            {isSaving ? "Uploading..." : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
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