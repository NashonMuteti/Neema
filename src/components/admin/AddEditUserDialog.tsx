"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Image as ImageIcon, Save, Upload } from "lucide-react";
import { UserRole as UserRoleType } from './AddEditUserRoleDialog';
import { User } from '@/context/AuthContext'; // Import the centralized User interface
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";

interface AddEditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: User; // For editing existing user
  onSave: () => void; // Changed to trigger a re-fetch in parent
  availableRoles: UserRoleType[]; // New prop: list of available roles
}

const AddEditUserDialog: React.FC<AddEditUserDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
  availableRoles,
}) => {
  const { currentUser: loggedInUser } = useAuth(); // Renamed to avoid conflict
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageUserProfiles } = React.useMemo(() => {
    if (!loggedInUser || !definedRoles) {
      return { canManageUserProfiles: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === loggedInUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageUserProfiles = currentUserPrivileges.includes("Manage User Profiles");
    return { canManageUserProfiles };
  }, [loggedInUser, definedRoles]);

  const [name, setName] = React.useState(initialData?.name || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [role, setRole] = React.useState<string>(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : "")); // Initialize with first available role or empty
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">(initialData?.status || "Active");
  const [enableLogin, setEnableLogin] = React.useState(initialData?.enableLogin || false);
  const [defaultPassword, setDefaultPassword] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.imageUrl || null);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setRole(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : "")); // Re-initialize role
      setStatus(initialData?.status || "Active");
      setEnableLogin(initialData?.enableLogin || false);
      setDefaultPassword(""); // Always clear password field on open
      setSelectedFile(null);
      setPreviewUrl(initialData?.imageUrl || null);
    }
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, initialData, previewUrl, availableRoles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(initialData?.imageUrl || null);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    if (enableLogin && !initialData && !defaultPassword) { // Require password only for new users with login enabled
      showError("Default password is required if login is enabled for a new user.");
      return;
    }
    if (!role) {
      showError("User Role is required.");
      return;
    }

    let userImageUrl: string | undefined = initialData?.imageUrl;
    if (selectedFile && previewUrl) {
      userImageUrl = previewUrl;
      // In a real app, you'd upload the file to Supabase Storage here
      // For now, we're using a blob URL for preview.
    } else if (!selectedFile && !initialData?.imageUrl) {
      userImageUrl = undefined;
    }

    if (initialData?.id) {
      // Editing existing user in Supabase Auth and profiles table
      // Only update metadata in auth.users, email changes are complex via admin
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(initialData.id, {
        email: email, // Admin can update email directly without confirmation
        password: defaultPassword || undefined, // Only update if provided
        user_metadata: { full_name: name, avatar_url: userImageUrl },
      });

      if (authUpdateError) {
        console.error("Error updating Supabase Auth user:", authUpdateError);
        showError("Failed to update user authentication details.");
        return;
      }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ name, email, role, status, enable_login: enableLogin, image_url: userImageUrl })
        .eq('id', initialData.id);

      if (profileUpdateError) {
        console.error("Error updating user profile:", profileUpdateError);
        showError("Failed to update user profile details.");
        return;
      }

    } else {
      // Add new user to Supabase Auth and profiles table
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: defaultPassword || "default_secure_password", // Fallback password if not provided
        options: {
          data: {
            full_name: name,
            avatar_url: userImageUrl,
          },
        },
      });

      if (signUpError) {
        console.error("Error signing up new user:", signUpError);
        showError(`Failed to add new user: ${signUpError.message}`);
        return;
      }

      if (signUpData.user) {
        // Update the profile with the selected role and status
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ role, status, enable_login: enableLogin })
          .eq('id', signUpData.user.id);

        if (profileUpdateError) {
          console.error("Error updating new user's profile with role/status:", profileUpdateError);
          showError("Failed to set new user's role and status.");
          return;
        }
      }
    }

    onSave(); // Trigger the parent to re-fetch users
    showSuccess(`User ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit User Profile" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to ${initialData.name}'s profile.` : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4 col-span-full">
            {previewUrl ? (
              <img src={previewUrl} alt="User Avatar Preview" className="w-24 h-24 object-cover rounded-full border" />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground border">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="user-image-upload" className="text-center">Upload Image</Label>
              <Input
                id="user-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="col-span-3"
                disabled={!canManageUserProfiles}
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
              disabled={!canManageUserProfiles}
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
              disabled={!canManageUserProfiles}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={(value: string) => setRole(value)} disabled={!canManageUserProfiles}>
              <SelectTrigger id="role" className="col-span-3">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>User Role</SelectLabel>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
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
            <Select value={status} onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} disabled={!canManageUserProfiles}>
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>User Status</SelectLabel>
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
              disabled={!canManageUserProfiles}
            />
          </div>
          {enableLogin && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultPassword" className="text-right">
                {initialData ? "Reset Password" : "Default Password"}
              </Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder={initialData ? "Leave blank to keep current" : "Enter default password"}
                className="col-span-3"
                disabled={!canManageUserProfiles}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageUserProfiles}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add User"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving, along with backend authentication for login, require backend integration (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserDialog;