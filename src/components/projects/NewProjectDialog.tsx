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
import { Image as ImageIcon, Upload, CalendarIcon } from "lucide-react"; // Import CalendarIcon
import { showSuccess, showError } from "@/utils/toast";
import { Calendar } from "@/components/ui/calendar"; // Import Calendar
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { cn } from "@/lib/utils"; // Import cn for styling
import { format } from "date-fns"; // Import format for date display

interface NewProjectDialogProps {
  onAddProject: (projectData: { name: string; description: string; thumbnailUrl?: string; dueDate?: Date; memberContributionAmount?: number }) => void;
}

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ onAddProject }) => {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [memberContributionAmount, setMemberContributionAmount] = React.useState<string>(""); // New: Member contribution amount
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
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
      setPreviewUrl(null);
    }
  };

  const handleSubmit = () => {
    if (!name) {
      showError("Project Name is required.");
      return;
    }

    const parsedContributionAmount = parseFloat(memberContributionAmount);
    if (memberContributionAmount !== "" && (isNaN(parsedContributionAmount) || parsedContributionAmount < 0)) {
      showError("Please enter a valid non-negative number for member contribution.");
      return;
    }

    let projectThumbnailUrl: string | undefined = undefined;
    if (selectedFile && previewUrl) {
      projectThumbnailUrl = previewUrl;
    }

    onAddProject({
      name,
      description,
      thumbnailUrl: projectThumbnailUrl,
      dueDate,
      memberContributionAmount: memberContributionAmount === "" ? undefined : parsedContributionAmount,
    });
    showSuccess("Project added successfully!");
    setIsOpen(false);
    setName("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setDueDate(undefined);
    setMemberContributionAmount(""); // Reset
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new project.
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
          <div className="grid grid-cols-4 items-center gap-4"> {/* New: Member Contribution Amount */}
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
            />
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
          <Button onClick={handleSubmit}>Save Project</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;