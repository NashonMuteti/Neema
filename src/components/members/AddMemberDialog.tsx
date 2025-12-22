"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import { Image as ImageIcon, Upload } from "lucide-react"; // Import ImageIcon and Upload
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { fileUploadSchema } from "@/utils/security";

interface AddMemberDialogProps {
  onAddMember: () => void; // Changed to trigger a re-fetch in parent
}

// Function to generate a strong random password
const generateRandomPassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

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
  const [enableLogin, setEnableLogin] = React.useState(false);
  const [password, setPassword] = React.useState(""); // Changed from defaultPassword to password
  const [generatedPassword, setGeneratedPassword] = React.useState<string | null>(null); // To display generated password
  const [selectedRole, setSelectedRole] = React.useState<string>(definedRoles.length > 0 ? definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name : "");
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">("Active");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // Clean up the object URL when the component unmounts or file changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  React.useEffect(() => {
    if (definedRoles.length > 0 && !selectedRole) {
      setSelectedRole(definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name);
    }
  }, [definedRoles, selectedRole]);

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
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    
    let finalPassword = password;
    if (enableLogin && !password) {
      // If login is enabled but no password provided, generate one
      finalPassword = generateRandomPassword();
      setGeneratedPassword(finalPassword); // Store to display to admin
    } else if (!enableLogin) {
      finalPassword = ""; // Ensure no password is sent if login is disabled
    }
    
    if (enableLogin && !finalPassword) {
      showError("Password is required if login is enabled.");
      return;
    }
    
    if (!selectedRole) {
      showError("A role must be selected for the new member.");
      return;
    }
    
    let memberImageUrl: string | undefined = undefined;
    if (selectedFile) {
      // Validate file before upload
      try {
        fileUploadSchema.parse(selectedFile);
        // --- START SUPABASE STORAGE UPLOAD LOGIC ---
        // In a real app, you'd upload the file to Supabase Storage here.
        // Example:
        // const { data: uploadData, error: uploadError } = await supabase.storage
        //   .from('avatars') // Your storage bucket name
        //   .upload(`${userData.user.id}/${selectedFile.name}`, selectedFile, {
        //     cacheControl: '3600',
        //     upsert: false,
        //   });
        // if (uploadError) throw uploadError;
        // const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        // memberImageUrl = publicUrlData.publicUrl;
        // --- END SUPABASE STORAGE UPLOAD LOGIC ---
        
        // For now, using the preview URL as a placeholder for the uploaded URL
        memberImageUrl = previewUrl || undefined; 
      } catch (error) {
        console.error("File validation error or upload failed:", error);
        showError("Invalid file or failed to upload image. Please upload an image file less than 5MB.");
        return;
      }
    }
    
    // Create user in Supabase Auth using admin API
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email: email,
      password: enableLogin ? finalPassword : undefined, // Only set password if login is enabled
      email_confirm: true, // Automatically confirm email for admin-created users
      user_metadata: {
        full_name: name,
        avatar_url: memberImageUrl,
        // Pass role, status, enable_login to metadata for handle_new_user trigger
        role: selectedRole, 
        status: status, 
        enable_login: enableLogin,
      },
    });
    
    if (createUserError) {
      console.error("Error creating new member in Auth:", createUserError);
      showError(`Failed to add new member: ${createUserError.message}`);
      return;
    }
    
    // The handle_new_user trigger should handle the initial profile creation in public.profiles.
    // If additional updates are needed beyond what the trigger handles, they would go here.
    
    onAddMember(); // Trigger parent to re-fetch members
    showSuccess("Member added successfully!");
    if (generatedPassword) {
      showSuccess(`Generated password for ${name}: ${generatedPassword}. Please communicate this securely.`);
    }
    setIsOpen(false);
    
    // Reset form states
    setName("");
    setEmail("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setEnableLogin(false);
    setPassword("");
    setGeneratedPassword(null);
    setSelectedRole(definedRoles.length > 0 ? definedRoles.find(r => r.name === "Contributor")?.name || definedRoles[0].name : "");
    setStatus("Active");
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
              <img
                src={previewUrl}
                alt="Member Avatar Preview"
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
                disabled={!canManageMembers}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="member-role" className="text-right">
              Role
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!canManageMembers}>
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
            <Select value={status} onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} disabled={!canManageMembers}>
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
              onCheckedChange={(checked) => {
                setEnableLogin(checked as boolean);
                if (!checked) {
                  setPassword(""); // Clear password if login is disabled
                  setGeneratedPassword(null);
                }
              }}
              className="col-span-3"
              disabled={!canManageMembers}
            />
          </div>
          {enableLogin && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className="col-span-3"
                disabled={!canManageMembers}
              />
            </div>
          )}
          {generatedPassword && (
            <div className="col-span-full text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
              Generated Password: <span className="font-mono font-semibold">{generatedPassword}</span>
              <p className="text-xs text-muted-foreground mt-1">Please communicate this securely to the user.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!name || !email || !canManageMembers || !selectedRole || (enableLogin && !password && !generatedPassword)}
          >
            <Upload className="mr-2 h-4 w-4" /> Save Member
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

export default AddMemberDialog;