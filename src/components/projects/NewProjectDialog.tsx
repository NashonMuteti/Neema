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
import { Image as ImageIcon, Upload, CalendarIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileUploadSchema } from "@/utils/security";

interface NewProjectDialogProps {
  onAddProject: (projectData: { name: string; description: string; thumbnailUrl?: string; dueDate?: Date; memberContributionAmount?: number }) => void;
}

// Define the schema for form validation
const newProjectSchema = z.object({
  name: z.string().min(1, "Project Name is required."),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  memberContributionAmount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, "Amount cannot be negative.").optional().nullable()
  ),
});

type NewProjectFormValues = z.infer<typeof newProjectSchema>;

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ onAddProject }) => {
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
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null); // State for the blob URL
  const [isSaving, setIsSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<NewProjectFormValues>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: undefined,
      memberContributionAmount: undefined,
    },
  });

  // Effect to reset form fields when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedFile(null); // Clear selected file on open
      setBlobUrl(null); // Clear blobUrl on open
    }
  }, [isOpen, reset]);

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

  // Determine the URL to display: blobUrl if present, otherwise null
  const displayImageUrl = blobUrl || null;

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

  const onSubmit = async (data: NewProjectFormValues) => {
    if (!currentUser) {
      showError("You must be logged in to create a project.");
      return;
    }

    setIsSaving(true);
    let projectThumbnailUrl: string | undefined = undefined;
    if (selectedFile) {
      const filePath = `project-thumbnails/${currentUser.id}/${data.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const uploadedUrl = await uploadFileToSupabase('project-thumbnails', selectedFile, filePath);
      if (uploadedUrl) {
        projectThumbnailUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

    onAddProject({
      name: data.name,
      description: data.description || "",
      thumbnailUrl: projectThumbnailUrl,
      dueDate: data.dueDate || undefined,
      memberContributionAmount: data.memberContributionAmount || undefined,
    });
    
    setIsOpen(false);
    reset();
    setSelectedFile(null);
    setBlobUrl(null); // Ensure blobUrl is cleared
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canManageProjects}>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              {...register("name")}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
            {errors.name && <p className="col-span-4 text-right text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="due-date" className="text-right">
              Due Date
            </Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!canManageProjects || isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
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
              {...register("memberContributionAmount")}
              className="col-span-3"
              disabled={!canManageProjects || isSaving}
            />
            {errors.memberContributionAmount && <p className="col-span-4 text-right text-sm text-destructive">{errors.memberContributionAmount.message}</p>}
          </div>
          <div className="flex flex-col items-center gap-4 col-span-full">
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="Project Thumbnail Preview" className="w-32 h-32 object-cover rounded-md border" />
            ) : (
              <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
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
          <div className="flex justify-end">
            <Button type="submit" disabled={!canManageProjects || isSaving}>
              {isSaving ? "Saving..." : "Save Project"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Note: Image storage and serving require backend integration.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;