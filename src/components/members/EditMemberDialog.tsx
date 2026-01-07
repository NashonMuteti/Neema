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
import { Image as ImageIcon, Upload } from "lucide-react";
import { useAuth, User } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { fileUploadSchema } from "@/utils/security";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileToBase64 } from "@/utils/imageUtils"; // New import

interface EditMemberDialogProps {
  member: User;
  onEditMember: () => void;
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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [base64Image, setBase64Image] = React.useState<string | null>(null); // State for Base64 image
  const [enableLogin, setEnableLogin] = React.useState(member.enableLogin);
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">(member.status);
  const [selectedRole, setSelectedRole] = React.useState<string>(member.role);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Effect to reset form fields when dialog opens or member data changes
  React.useEffect(() => {
    if (isOpen) {
      setName(member.name);
      setEmail(member.email);
      setSelectedFile(null); // Clear selected file on open
      setBase64Image(null); // Clear Base64 image on open
      setEnableLogin(member.enableLogin);
      setStatus(member.status);
      setSelectedRole(member.role);
    }
  }, [isOpen, member]);

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

  // Determine the URL to display: base64Image if present, otherwise member.imageUrl
  const displayImageUrl = base64Image || member.imageUrl || null;

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
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    if (!selectedRole) {
      showError("A role must be selected for the member.");
      return;
    }

    setIsSaving(true);
    let memberImageUrl: string | undefined = member.imageUrl;
    if (selectedFile) {
      const filePath = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`; // Corrected: Removed 'avatars/' prefix
      const uploadedUrl = await uploadFileToSupabase('avatars', selectedFile, filePath);
      if (uploadedUrl) {
        memberImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    } else if (!selectedFile && member.imageUrl && !base64Image) {
      // If user cleared the selection, remove the existing thumbnail URL from DB
      memberImageUrl = undefined;
    }

    // Check if the member has an associated auth.users entry
    const { data: authUser, error: fetchAuthUserError } = await supabase.auth.admin.getUserById(member.id);
    const hasAuthUser = !fetchAuthUserError && authUser.user !== null;

    const oldEnableLogin = member.enableLogin;
    const newEnableLogin = enableLogin;

    if (hasAuthUser) {
      // Member has an auth.users entry
      // Update Supabase auth user metadata (for full_name)
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(member.id, {
        email: email,
        user_metadata: { full_name: name, avatar_url: memberImageUrl },
      });

      if (authUpdateError) {
        console.error("Error updating user metadata:", authUpdateError);
        showError("Failed to update member authentication details.");
        setIsSaving(false);
        return;
      }

      // If login was disabled and is now enabled, and they haven't set a password, send invite
      if (newEnableLogin && !oldEnableLogin) {
        const userAuthData = authUser.user; // Corrected variable name
        if (!userAuthData?.email_confirmed_at && !userAuthData?.last_sign_in_at) {
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: window.location.origin + '/login',
          });
          if (inviteError) {
            console.error("Error sending invitation email:", inviteError);
            showError(`User updated, but failed to send invitation email: ${inviteError.message}`);
          } else {
            showSuccess("User updated and invitation email sent successfully!");
          }
        }
      }
    } else {
      // Member does NOT have an auth.users entry (non-login member)
      if (newEnableLogin && !oldEnableLogin) {
        // Admin is trying to enable login for a non-login member (Option A)
        showError("To enable login for this member, please create a new user account with login enabled and then manually transfer any existing data. Direct conversion is not supported.");
        setIsSaving(false);
        return;
      }
    }

    // Update public.profiles table
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ name, email, enable_login: newEnableLogin, image_url: memberImageUrl, status, role: selectedRole })
      .eq('id', member.id);

    if (profileUpdateError) {
      console.error("Error updating member profile:", profileUpdateError);
      showError("Failed to update member profile details.");
      setIsSaving(false);
      return;
    }

    onEditMember();
    showSuccess("Member updated successfully!");
    setIsOpen(false);
    setIsSaving(false);
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
              disabled={!canManageMembers || isSaving}
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
              disabled={!canManageMembers || isSaving}
            />
          </div>
          <div className="flex flex-col items-center gap-4 col-span-full">
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="Member Avatar Preview" className="w-24 h-24 object-cover rounded-full border" />
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
                disabled={!canManageMembers || isSaving}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="member-role" className="text-right">
              Role
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!canManageMembers || isSaving}>
              <SelectTrigger id="member-role" className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Member Role</SelectLabel>
                  {definedRoles.map((roleOption) => (
                    <SelectItem key={roleOption.id} value={roleOption.name}>
                      {roleOption.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} disabled={!canManageMembers || isSaving}>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="enableLogin" className="text-right">
              Enable Login
            </Label>
            <Checkbox
              id="enableLogin"
              checked={enableLogin}
              onCheckedChange={(checked) => setEnableLogin(checked as boolean)}
              className="col-span-3"
              disabled={!canManageMembers || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageMembers || isSaving}>Save Changes</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Password resets must be initiated separately. Image storage and serving require backend integration (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;