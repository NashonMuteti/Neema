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
import { Image as ImageIcon, Upload, CalendarIcon } from "lucide-react"; // Import CalendarIcon
import { showSuccess, showError } from "@/utils/toast";
import { Calendar } from "@/components/ui/calendar"; // Import Calendar
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { cn } from "@/lib/utils"; // Import cn for styling
import { format } from "date-fns"; // Import format for date display

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted";
  thumbnailUrl?: string;
  dueDate?: Date; // New: Optional due date
}

interface EditProjectDialogProps {
  project: Project;
  onEditProject: (projectData: Project) => void;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ project, onEditProject }) => {
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description);
  const [status, setStatus] = React.useState<"Open" | "Closed" | "Deleted">(project.status);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(project.thumbnailUrl || null);
  const [dueDate, setDueDate] = React.useState<Date | undefined>(project.dueDate ? new Date(project.dueDate) : undefined); // New: Due date state
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setSelectedFile(null);
      setPreviewUrl(project.thumbnailUrl || null);
      setDueDate(project.dueDate ? new Date(project.dueDate) : undefined); // Reset due date
    }
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, project, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(project.thumbnailUrl || null);
    }
  };

  const handleSubmit = () => {
    if (!name) {
      showError("Project Name is required.");
      return;
    }

    let projectThumbnailUrl: string | undefined = project.thumbnailUrl;
    if (selectedFile && previewUrl) {
      projectThumbnailUrl = previewUrl;
    } else if (!selectedFile && !project.thumbnailUrl) {
      projectThumbnailUrl = undefined;
    }

    onEditProject({
      ...project,
      name,
      description,
      status,
      thumbnailUrl: projectThumbnailUrl,
      dueDate, // Pass dueDate
    });
    showSuccess("Project updated successfully!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
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
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4"> {/* New: Due Date field */}
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
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: "Open" | "Closed" | "Deleted") => setStatus(value)}>
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Project Status</SelectLabel>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Deleted">Deleted</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col items-center gap-4 col-span-full">
            {previewUrl ? (
              <img src={previewUrl} alt="Project Thumbnail Preview" className="w-32 h-32 object-cover rounded-md border" />
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
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;