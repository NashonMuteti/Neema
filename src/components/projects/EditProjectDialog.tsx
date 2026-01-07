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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, Upload, CalendarIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileUploadSchema } from "@/utils/security";
import { fileToBase64 } from "@/utils/imageUtils"; // New import

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
  thumbnailUrl?: string;
  dueDate?: Date;
  memberContributionAmount?: number;
  profile_id: string; // Changed from user_id to profile_id
}

interface EditProjectDialogProps {
  project: Project;
  onEditProject: (projectData: Project) => void;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ project, onEditProject }) => {
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

  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description);
  const [status, setStatus] = React.useState<"Open" | "Closed" | "Deleted" | "Suspended">(project.status);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [base64Image, setBase64Image] = React.useState<string | null>(null); // State for Base64 image
  const [dueDate, setDueDate] = React.useState<Date | undefined>(project.dueDate ? new Date(project.dueDate) : undefined);
  const [memberContributionAmount, setMemberContributionAmount] = React.useState<string>(
    project.memberContributionAmount !== undefined ? project.memberContributionAmount.toString() : ""
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Effect to reset form fields when dialog opens or project data changes
  React.useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setSelectedFile(null); // Clear selected file on open
      setBase64Image(null); // Clear Base64 image on open
      setDueDate(project.dueDate ? new Date(project.dueDate) : undefined);
      setMemberContributionAmount(project.memberContributionAmount !== undefined ? project.memberContributionAmount.toString() : "");
    }
  }, [isOpen, project]);

  // Effect to convert selected file to Base64 for preview
  React.useEffect(() => {
    const convertFile = async () => {
      if (selectedFile) {
        try {
          const base64 = await fileToBase64(selectedFile);
          setBase64Image(base64);
        } catch (error) {
          console.error("Error converting file to Base64:", error);
          setBase64Image(null);
        }
      } else {
        setBase64Image(null);
      }
    };
    convertFile();
  }, [selectedFile]);

  // Determine the URL to display: base64Image if present, otherwise project.thumbnailUrl
  const displayImageUrl = base64Image || project.thumbnailUrl || null;

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

  const handleSubmit = async () => {
    if (!name) {
      showError("Project Name is required.");
      return;
    }
    if (!currentUser || project.profile_id !== currentUser.id) { // Changed from user_id to profile_id
      showError("You do not have permission to edit this project.");
      return;
    }

    const parsedContributionAmount = parseFloat(memberContributionAmount);
    if (memberContributionAmount !== "" && (isNaN(parsedContributionAmount) || parsedContributionAmount < 0)) {
      showError("Please enter a valid non-negative number for member contribution.");
      return;
    }

    setIsSaving(true);
    let projectThumbnailUrl: string | undefined = project.thumbnailUrl;
    if (selectedFile) {
      const filePath = `${project.profile_id}/${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`; // Corrected: Removed 'project-thumbnails/' prefix
      const uploadedUrl = await uploadFileToSupabase('project-thumbnails', selectedFile, filePath);
      if (uploadedUrl) {
        projectThumbnailUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    } else if (!selectedFile && project.thumbnailUrl && !base64Image) { // If no new file, but there was an old one, and no base64Image (meaning user cleared it)
      projectThumbnailUrl = undefined;
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        status,
        thumbnail_url: projectThumbnailUrl,
        due_date: dueDate?.toISOString(),
        member_contribution_amount: memberContributionAmount === "" ? null : parsedContributionAmount,
      })
      .eq('id', project.id);

    if (error) {
      console.error("Error updating project:", error);
      showError("Failed to update project.");
    } else {
      onEditProject({
        ...project,
        name,
        description,
        status,
        thumbnailUrl: projectThumbnailUrl,
        dueDate,
        memberContributionAmount: memberContributionAmount === "" ? undefined : parsedContributionAmount,
      });
      showSuccess("Project updated successfully!");
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageProjects}>Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Make changes to {project.name}'s details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="due-date" className="text-right">
              Due Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={!canManageProjects || isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="member-contribution" className="text-right">
              Member Contribution
            </Label>
            <Input
              id="member-contribution"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={memberContributionAmount}
              onChange={(e) => setMemberContributionAmount(e.target.value)}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: "Open" | "Closed" | "Deleted" | "Suspended") => setStatus(value)} disabled={!canManageProjects || isSaving}>
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Project Status</SelectLabel>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Deleted">Deleted</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col items-center gap-4 col-span-full">
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="Project Thumbnail Preview" className="w-48 h-48 object-cover rounded-md border" /> {/* Increased size */}
            ) : (
              <div className="w-48 h-48 bg-muted rounded-md flex items-center justify-center text-muted-foreground border"> {/* Increased size */}
                <ImageIcon className="h-24 w-24" /> {/* Scaled icon */}
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="project-image-upload" className="text-center">Upload Thumbnail</Label>
              <Input
                id="project-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="col-span-3"
                disabled={!canManageProjects || isSaving}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageProjects || isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;