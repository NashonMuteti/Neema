"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Save, Image as ImageIcon, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import { fileUploadSchema } from "@/utils/security";

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  image_url?: string; // Changed to image_url to match Supabase column
}

interface AddEditBoardMemberDialogProps {
  initialData?: BoardMember; // For editing existing member
  onSave: (member: Omit<BoardMember, 'id'> & { id?: string }) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AddEditBoardMemberDialog: React.FC<AddEditBoardMemberDialogProps> = ({
  initialData,
  onSave,
  isOpen,
  setIsOpen,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const { canManageBoardMembers } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageBoardMembers: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageBoardMembers = currentUserPrivileges.includes("Manage Board Members");
    return { canManageBoardMembers };
  }, [currentUser, definedRoles]);

  const [name, setName] = React.useState(initialData?.name || "");
  const [role, setRole] = React.useState(initialData?.role || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [address, setAddress] = React.useState(initialData?.address || "");
  const [notes, setNotes] = React.useState(initialData?.notes || "");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.image_url || null); // Use image_url

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setRole(initialData?.role || "");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "");
      setAddress(initialData?.address || "");
      setNotes(initialData?.notes || "");
      setSelectedFile(null); // Reset selected file
      setPreviewUrl(initialData?.image_url || null); // Reset preview to current image
    }
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, initialData, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file before processing
      try {
        fileUploadSchema.parse(file);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file)); // Create a URL for immediate preview
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        event.target.value = ""; // Reset the input
        return;
      }
    } else {
      setSelectedFile(null);
      setPreviewUrl(initialData?.image_url || null);
    }
  };

  const handleSubmit = async () => {
    if (!name || !role || !email || !phone) {
      showError("Name, Role, Email, and Phone are required.");
      return;
    }
    
    let memberImageUrl: string | undefined = initialData?.image_url;
    if (selectedFile) {
      // Validate file before upload
      try {
        fileUploadSchema.parse(selectedFile);
        // --- START SUPABASE STORAGE UPLOAD LOGIC ---
        // In a real app, you'd upload the file to Supabase Storage here.
        // Example:
        // const { data: uploadData, error: uploadError } = await supabase.storage
        //   .from('board-member-images') // Your storage bucket name
        //   .upload(`${initialData?.id || 'new_member'}/${selectedFile.name}`, selectedFile, {
        //     cacheControl: '3600',
        //     upsert: true, // Use upsert to replace existing image
        //   });
        // if (uploadError) {
        //   console.error("Error uploading image to storage:", uploadError);
        //   showError("Failed to upload image.");
        //   return;
        // }
        // const { data: publicUrlData } = supabase.storage.from('board-member-images').getPublicUrl(uploadData.path);
        // memberImageUrl = publicUrlData.publicUrl;
        // --- END SUPABASE STORAGE UPLOAD LOGIC ---
        
        // For now, using the preview URL as a placeholder for the uploaded URL
        memberImageUrl = previewUrl;
      } catch (error) {
        console.error("File validation error or upload failed:", error);
        showError("Invalid file or failed to upload image. Please upload an image file less than 5MB.");
        return;
      }
    } else if (!selectedFile && !initialData?.image_url) {
      // If no new file and no existing image, ensure imageUrl is undefined
      memberImageUrl = undefined;
    }
    
    const memberData: Omit<BoardMember, 'id'> & { id?: string } = {
      name,
      role,
      email,
      phone,
      address: address || undefined,
      notes: notes || undefined,
      image_url: memberImageUrl, // Use image_url
    };
    
    if (initialData?.id) {
      memberData.id = initialData.id;
    }
    
    onSave(memberData); // Call the parent's onSave for local state update (if still used)
    showSuccess(`Board member ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Board Member" : "Add New Board Member"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to ${initialData.name}'s details.` : "Enter the details for the new board member."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4 col-span-full">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Board Member Avatar Preview"
                className="w-24 h-24 object-cover rounded-full border"
              />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="member-image-upload" className="text-center">
                Upload Image
              </Label>
              <Input
                id="member-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="col-span-3"
                disabled={!canManageBoardMembers}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              disabled={!canManageBoardMembers}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="col-span-3"
              disabled={!canManageBoardMembers}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              disabled={!canManageBoardMembers}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
              disabled={!canManageBoardMembers}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-3"
              placeholder="Optional address details"
              disabled={!canManageBoardMembers}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Any additional notes"
              disabled={!canManageBoardMembers}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageBoardMembers}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Member"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving require backend integration (e.g., Supabase Storage with RLS).
          Client-side image validation is present, but server-side validation is also crucial.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditBoardMemberDialog;