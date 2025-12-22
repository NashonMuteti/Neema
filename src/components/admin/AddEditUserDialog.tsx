"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Image as ImageIcon, Save, Upload } from "lucide-react";
import { UserRole as UserRoleType } from './AddEditUserRoleDialog';
import { User } from '@/context/AuthContext';
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { fileUploadSchema } from "@/utils/security";

interface AddEditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: User;
  onSave: () => void;
  availableRoles: UserRoleType[];
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

const AddEditUserDialog: React.FC<AddEditUserDialogProps> = ({ 
  isOpen, 
  setIsOpen, 
  initialData, 
  onSave,
  availableRoles,
}) => {
  const { currentUser: loggedInUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  // Check if user is Super Admin
  const isSuperAdmin = loggedInUser?.role === "Super Admin";
  
  const { canManageUserProfiles } = React.useMemo(() => {
    if (!loggedInUser || !definedRoles) {
      return { canManageUserProfiles: false };
    }
    
    // Super Admin can manage user profiles
    if (isSuperAdmin) {
      return { canManageUserProfiles: true };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === loggedInUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageUserProfiles = currentUserPrivileges.includes("Manage User Profiles");
    
    return { canManageUserProfiles };
  }, [loggedInUser, definedRoles, isSuperAdmin]);

  const [name, setName] = React.useState(initialData?.name || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [role, setRole] = React.useState<string>(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : ""));
  const [status, setStatus] = React.useState<"Active" | "Inactive" | "Suspended">(initialData?.status || "Active");
  const [enableLogin, setEnableLogin] = React.useState(initialData?.enableLogin || false);
  const [password, setPassword] = React.useState(""); // Changed from defaultPassword to password
  const [generatedPassword, setGeneratedPassword] = React.useState<string | null>(null); // To display generated password
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.imageUrl || null);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setRole(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : ""));
      setStatus(initialData?.status || "Active");
      setEnableLogin(initialData?.enableLogin || false);
      setPassword(""); // Clear password field on open
      setGeneratedPassword(null);
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
      // Validate file before processing
      try {
        fileUploadSchema.parse(file);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } catch (error) {
        console.error("File validation error:", error);
        showError("Invalid file. Please upload an image file less than 5MB.");
        event.target.value = ""; // Reset the input
        return;
      }
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
    
    let finalPassword = password;
    if (enableLogin && !initialData && !password) {
      // If creating a new user, login is enabled, and no password provided, generate one
      finalPassword = generateRandomPassword();
      setGeneratedPassword(finalPassword); // Store to display to admin
    } else if (!enableLogin) {
      finalPassword = ""; // Ensure no password is sent if login is disabled
    }
    
    if (enableLogin && !finalPassword && !initialData) { // For new users, password is mandatory if login enabled
      showError("Password is required if login is enabled for a new user.");
      return;
    }
    
    if (!role) {
      showError("User Role is required.");
      return;
    }
    
    let userImageUrl: string | undefined = initialData?.imageUrl;
    if (selectedFile) {
      // Validate file before upload
      try {
        fileUploadSchema.parse(selectedFile);
        // --- START SUPABASE STORAGE UPLOAD LOGIC ---
        // In a real app, you'd upload the file to Supabase Storage here.
        // Example:
        // const { data: uploadData, error: uploadError } = await supabase.storage
        //   .from('avatars') // Your storage bucket name
        //   .upload(`${initialData?.id || 'new_user'}/${selectedFile.name}`, selectedFile, {
        //     cacheControl: '3600',
        //     upsert: false,
        //   });
        // if (uploadError) throw uploadError;
        // const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        // userImageUrl = publicUrlData.publicUrl;
        // --- END SUPABASE STORAGE UPLOAD LOGIC ---
        
        // For now, using the preview URL as a placeholder for the uploaded URL
        userImageUrl = previewUrl;
      } catch (error) {
        console.error("File validation error or upload failed:", error);
        showError("Invalid file or failed to upload image. Please upload an image file less than 5MB.");
        return;
      }
    } else if (!selectedFile && !initialData?.imageUrl) {
      userImageUrl = undefined;
    }
    
    if (initialData?.id) {
      // Editing existing user in Supabase Auth and profiles table
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(initialData.id, {
        email: email,
        password: finalPassword || undefined, // Only update password if provided
        user_metadata: { full_name: name, avatar_url: userImageUrl },
      });
      
      if (authUpdateError) {
        console.error("Error updating Supabase Auth user:", authUpdateError);
        showError("Failed to update user authentication details.");
        return;
      }
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          role,
          status,
          enable_login: enableLogin,
          image_url: userImageUrl
        })
        .eq('id', initialData.id);
        
      if (profileUpdateError) {
        console.error("Error updating user profile:", profileUpdateError);
        showError("Failed to update user profile details.");
        return;
      }
    } else {
      // Add new user to Supabase Auth and profiles table
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        password: finalPassword, // Password is required for admin.createUser
        email_confirm: true, // Automatically confirm email for admin-created users
        user_metadata: {
          full_name: name,
          avatar_url: userImageUrl,
          role: role, // Pass role to metadata for handle_new_user trigger
          status: status, // Pass status to metadata for handle_new_user trigger
          enable_login: enableLogin, // Pass enable_login to metadata for handle_new_user trigger
        },
      });
      
      if (createUserError) {
        console.error("Error creating new user in Auth:", createUserError);
        showError(`Failed to add new user: ${createUserError.message}`);
        return;
      }
      
      // The handle_new_user trigger should handle the initial profile creation.
      // If additional updates are needed beyond what the trigger handles, they would go here.
      // For now, assuming handle_new_user handles role, status, enable_login.
    }
    
    onSave();
    showSuccess(`User ${initialData ? "updated" : "added"} successfully!`);
    if (generatedPassword) {
      showSuccess(`Generated password for ${name}: ${generatedPassword}. Please communicate this securely.`);
    }
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
            <Select 
              value={role} 
              onValueChange={(value: string) => setRole(value)} 
              disabled={!canManageUserProfiles}
            >
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
            <Select 
              value={status} 
              onValueChange={(value: "Active" | "Inactive" | "Suspended") => setStatus(value)} 
              disabled={!canManageUserProfiles}
            >
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
              onCheckedChange={(checked) => {
                setEnableLogin(checked as boolean);
                if (!checked) {
                  setPassword(""); // Clear password if login is disabled
                  setGeneratedPassword(null);
                }
              }} 
              className="col-span-3" 
              disabled={!canManageUserProfiles}
            />
          </div>
          {enableLogin && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {initialData ? "Reset Password" : "Password"}
              </Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={initialData ? "Leave blank to keep current" : "Leave blank to auto-generate"} 
                className="col-span-3" 
                disabled={!canManageUserProfiles}
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
            disabled={!canManageUserProfiles || (enableLogin && !password && !generatedPassword && !initialData)}
          >
            <Save className="mr-2 h-4 w-4" />
            {initialData ? "Save Changes" : "Add User"}
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

export default AddEditUserDialog;