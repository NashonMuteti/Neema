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
import { Image as ImageIcon, Upload } from "lucide-react"; // Import ImageIcon and Upload
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

interface AddMemberDialogProps {
  onAddMember: () => void; // Changed to trigger a re-fetch in parent
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ onAddMember }) => {
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

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // State for the uploaded file
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [enableLogin, setEnableLogin] = React.useState(false); // Corrected line
  const [defaultPassword, setDefaultPassword] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // Clean up the object URL when the component unmounts or file changes
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
      setPreviewUrl(URL.createObjectURL(file)); // Create a URL for immediate preview
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    if (enableLogin && !defaultPassword) {
      showError("Default password is required if login is enabled.");
      return;
    }

    let memberImageUrl: string | undefined = undefined;
    if (selectedFile) {
      // In a real app, this is where you'd upload the file to a storage service
      // and get a permanent URL. For now, we use the preview URL.
      memberImageUrl = previewUrl || undefined;
    }

    // Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: defaultPassword || "default_secure_password", // Fallback password if not provided
      options: {
        data: {
          full_name: name,
          avatar_url: memberImageUrl,
        },
      },
    });

    if (signUpError) {
      console.error("Error signing up new member:", signUpError);
      showError(`Failed to add new member: ${signUpError.message}`);
      return;
    }

    if (signUpData.user) {
      // The handle_new_user trigger should create the profile.
      // We might need to explicitly update the role and enable_login if the trigger doesn't handle it.
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ role: "Contributor", status: "Active", enable_login: enableLogin })
        .eq('id', signUpData.user.id);

      if (profileUpdateError) {
        console.error("Error updating new member's profile with role/status:", profileUpdateError);
        showError("Failed to set new member's role and status.");
        return;
      }
    }

    onAddMember(); // Trigger parent to re-fetch members
    showSuccess("Member added successfully!");
    setIsOpen(false);
    // Reset form states
    setName("");
    setEmail("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setEnableLogin(false);
    setDefaultPassword("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canManageMembers}>Add Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Fill in the details for the new member.
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
                Default Password
              </Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="col-span-3"
                disabled={!canManageMembers}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!name || !email || (enableLogin && !defaultPassword) || !canManageMembers}>
            <Upload className="mr-2 h-4 w-4" /> Save Member
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Image storage and serving, along with backend authentication for login, require backend integration (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;