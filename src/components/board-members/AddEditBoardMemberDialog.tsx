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
import { supabase } from "@/integrations/supabase/client";
import { fileUploadSchema } from "@/utils/security";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  image_url?: string;
}

interface AddEditBoardMemberDialogProps {
  initialData?: BoardMember;
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
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(initialData?.image_url || null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Effect to reset form fields when dialog opens or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setRole(initialData?.role || "");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "");
      setAddress(initialData?.address || "");
      setNotes(initialData?.notes || "");
      setSelectedFile(null); // Clear selected file on open
      setLocalPreviewUrl(initialData?.image_url || null); // Set initial image URL
    }
  }, [isOpen, initialData]);

  // Effect to manage the blob URL lifecycle based on selectedFile
  React.useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setLocalPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl); // Revoke when selectedFile changes or component unmounts
    } else if (!initialData?.image_url) { // If no file selected and no initial image, ensure preview is null
      setLocalPreviewUrl(null);
    } else { // If no file selected but there's an initial image, use that
      setLocalPreviewUrl(initialData.image_url);
    }
  }, [selectedFile, initialData?.image_url]);

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

  const handleSubmit = async () => {
    if (!name || !role || !email || !phone) {
      showError("Name, Role, Email, and Phone are required.");
      return;
    }
    
    setIsSaving(true);
    let memberImageUrl: string | undefined = initialData?.image_url;
    if (selectedFile) {
      try {
        fileUploadSchema.parse(selectedFile);
        const filePath = `board-members/${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const uploadedUrl = await uploadFileToSupabase('board-members', selectedFile, filePath);
        if (uploadedUrl) {
          memberImageUrl = uploadedUrl;
        } else {
          setIsSaving(false);
          return;
        }
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        setIsSaving(false);
        return;
      }
    } else if (!selectedFile && !initialData?.image_url) {
      memberImageUrl = undefined;
    }
    
    const memberData: Omit<BoardMember, 'id'> & { id?: string } = {
      name,
      role,
      email,
      phone,
      address: address || undefined,
      notes: notes || undefined,
      image_url: memberImageUrl,
    };
    
    if (initialData?.id) {
      memberData.id = initialData.id;
    }
    
    onSave(memberData);
    showSuccess(`Board member ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
    setIsSaving(false);
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
            {localPreviewUrl ? (
              <img
                src={localPreviewUrl}
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
                disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
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
              disabled={!canManageBoardMembers || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageBoardMembers || isSaving}>
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Member"}</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditBoardMemberDialog;