"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import { Image as ImageIcon, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { fileUploadSchema } from "@/utils/security";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { fileToBase64 } from "@/utils/imageUtils"; // New import

interface AddMemberDialogProps {
  onAddMember: () => void;
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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [base64Image, setBase64Image] = React.useState<string | null>(null); // State for Base64 image
  const [enableLogin, setEnableLogin] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string>(definedRoles.length > 0 ? definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name : "");
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">("Active");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false); // Changed from isUploading to isSaving for broader scope

  // Effect to reset form fields when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setSelectedFile(null); // Clear selected file on open
      setBase64Image(null); // Clear Base64 image on open
      setEnableLogin(false);
      setSelectedRole(definedRoles.length > 0 ? definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name : "");
      setStatus("Active");
    }
  }, [isOpen, definedRoles]);

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

  // Determine the URL to display: base64Image if present, otherwise null
  const displayImageUrl = base64Image || null;

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
      showError("A role must be selected for the new member.");
      return;
    }
    
    setIsSaving(true);
    let memberImageUrl: string | undefined = undefined;

    if (selectedFile) {
      const filePath = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`; // Corrected: Removed 'avatars/' prefix
      const uploadedUrl = await uploadFileToSupabase('avatars', selectedFile, filePath);
      if (uploadedUrl) {
        memberImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }
    
    if (enableLogin) {
      // Create user in Supabase Auth. The handle_new_user trigger will create the profile.
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        user_metadata: {
          full_name: name,
          avatar_url: memberImageUrl,
          role: selectedRole,
          status: status,
          enable_login: enableLogin,
        },
      });
      
      if (createUserError) {
        console.error("Error creating new member in Auth:", createUserError);
        showError(`Failed to add new member: ${createUserError.message}`);
        setIsSaving(false);
        return;
      }
      
      if (userData.user) {
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: window.location.origin + '/login',
        });
        if (inviteError) {
          console.error("Error sending invitation email:", inviteError);
          showError(`Member created, but failed to send invitation email: ${inviteError.message}`);
        } else {
          showSuccess("Member added and invitation email sent successfully!");
        }
      }
    } else {
      // Add member directly to public.profiles without creating an auth.users entry
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          name: name,
          email: email,
          role: selectedRole,
          status: status,
          enable_login: false, // Explicitly false for non-login members
          image_url: memberImageUrl,
        });

      if (createProfileError) {
        console.error("Error adding non-login member to profiles:", createProfileError);
        showError(`Failed to add non-login member: ${createProfileError.message}`);
        setIsSaving(false);
        return;
      }
      showSuccess("Non-login member added successfully!");
    }
    
    onAddMember();
    setIsOpen(false);
    
    // Reset form states
    setName("");
    setEmail("");
    setSelectedFile(null);
    setBase64Image(null); // Ensure Base64 image is cleared
    setEnableLogin(false);
    setSelectedRole(definedRoles.length > 0 ? definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name : "");
    setStatus("Active");
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              <img
                src={displayImageUrl}
                alt="Member Avatar Preview"
                className="w-48 h-48 object-cover rounded-full border" // Increased size
              />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-full flex items-center justify-center text-muted-foreground border"> {/* Increased size */}
                <ImageIcon className="h-24 w-24" /> {/* Scaled icon */}
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
            <Label htmlFor="member-status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} disabled={!canManageMembers || isSaving}>
              <SelectTrigger id="member-status" className="col-span-3">
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
          <Button
            onClick={handleSubmit}
            disabled={!name || !email || !canManageMembers || !selectedRole || isSaving}
          >
            {isSaving ? "Saving..." : <><Upload className="mr-2 h-4 w-4" /> Save Member</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: If "Enable Login" is checked, an invitation email will be sent to the user to set their password.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;