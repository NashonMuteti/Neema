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
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, Upload } from "lucide-react"; // Import ImageIcon and Upload
import { useAuth, User } from "@/context/AuthContext"; // New import, use centralized User interface
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

interface EditMemberDialogProps {
  member: User; // Use the centralized User interface
  onEditMember: () => void; // Changed to trigger a re-fetch in parent
}

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ member, onEditMember }) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageMembers } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageMembers: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageMembers = currentUserPrivileges.includes("Manage Members");
    return { canManageMembers };
  }, [currentUser, definedRoles]);

  const [name, setName] = React.useState(member.name);
  const [email, setEmail] = React.useState(member.email);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // New state for uploaded file
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(member.imageUrl || null); // New state for image preview
  const [enableLogin, setEnableLogin] = React.useState(member.enableLogin);
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">(member.status);
  const [defaultPassword, setDefaultPassword] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(member.name);
      setEmail(member.email);
      setSelectedFile(null); // Reset selected file
      setPreviewUrl(member.imageUrl || null); // Reset preview to current image
      setEnableLogin(member.enableLogin);
      setStatus(member.status);
      setDefaultPassword("");
    }
    // Cleanup object URL when component unmounts or dialog closes
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, member, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create a URL for immediate preview
    } else {
      setSelectedFile(null);
      setPreviewUrl(member.imageUrl || null); // Revert to current image if no file selected
    }
  };

  const handleSubmit = async () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }

    let memberImageUrl: string | undefined = member.imageUrl;
    if (selectedFile && previewUrl) {
      memberImageUrl = previewUrl;
      // In a real app, you'd upload the file to Supabase Storage here
    } else if (!selectedFile && !member.imageUrl) {
      memberImageUrl = undefined;
    }

    // Update Supabase auth user metadata (for name and avatar)
    const { error: authUpdateError } = await supabase.auth.updateUser({
      email: email, // Can update email if needed, but usually handled by Supabase Auth UI
      data: { full_name: name, avatar_url: memberImageUrl },
    });

    if (authUpdateError) {
      console.error("Error updating Supabase Auth user:", authUpdateError);
      showError("Failed to update member authentication details.");
      return;
    }

    // Update public.profiles table
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ name, email, enable_login: enableLogin, image_url: memberImageUrl, status })
      .eq('id', member.id);

    if (profileUpdateError) {
      console.error("Error updating member profile:", profileUpdateError);
      showError("Failed to update member profile details.");
      return;
    }

    if (defaultPassword) {
      const { error: passwordResetError } = await supabase.auth.updateUser({
        password: defaultPassword,
      });
      if (passwordResetError) {
        console.error("Error resetting password:", passwordResetError);
        showError("Failed to reset member password.");
        return;
      }
    }

    onEditMember(); // Trigger parent to re-fetch members
    showSuccess("Member updated successfully!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageMembers}>Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Make changes to {member.name}'s profile.
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
              disabled={!canManageMembers}
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
              disabled={!canManageMembers}
            />
          </div>
          <div className="flex flex-col items-center gap-4 col-span-full">
            {previewUrl ? (
              <img src={previewUrl} alt="Member Avatar Preview" className="w-24 h-24 object-cover rounded-full border" />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="member-image-upload" className="text-center">Upload Image</Label>
              <Input
                id="member-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="col-span-3"
                disabled={!canManageMembers}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="enableLogin" className="text-right">
              Enable Login
            </Label>
            <Checkbox
              id="enableLogin"
              checked={enableLogin}
              onCheckedChange={(checked) => setEnableLogin(checked as boolean)}
              className="col-span-3"
              disabled={!canManageMembers}
            />
          </div>
          {enableLogin && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultPassword" className="text-right">
                Reset Password
              </Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="col-span-3"
                disabled={!canManageMembers}
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} disabled={!canManageMembers}>
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Member Status</SelectLabel>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageMembers}>Save Changes</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving, along with backend authentication for login, require backend integration (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;