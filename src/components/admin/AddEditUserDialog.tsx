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
import { uploadFileToSupabase } from "@/integrations/supabase/storage";

interface AddEditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: User;
  onSave: () => void;
  availableRoles: UserRoleType[];
}

const AddEditUserDialog: React.FC<AddEditUserDialogProps> = ({ 
  isOpen, 
  setIsOpen, 
  initialData, 
  onSave,
  availableRoles,
}) => {
  const { currentUser: loggedInUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  
  const isSuperAdmin = loggedInUser?.role === "Super Admin";
  
  const { canManageUserProfiles } = React.useMemo(() => {
    if (!loggedInUser || !definedRoles) {
      return { canManageUserProfiles: false };
    }
    
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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.imageUrl || null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setRole(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : ""));
      setStatus(initialData?.status || "Active");
      setEnableLogin(initialData?.enableLogin || false);
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
    
    if (!role) {
      showError("User Role is required.");
      return;
    }
    
    setIsSaving(true);
    let userImageUrl: string | undefined = initialData?.imageUrl;
    if (selectedFile) {
      const filePath = `avatars/${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const uploadedUrl = await uploadFileToSupabase('avatars', selectedFile, filePath);
      if (uploadedUrl) {
        userImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    } else if (!selectedFile && !initialData?.imageUrl) {
      userImageUrl = undefined;
    }
    
    if (initialData?.id) {
      // Editing existing user
      const oldEnableLogin = initialData.enableLogin;
      const newEnableLogin = enableLogin;

      // Check if the user has an auth.users entry
      const { data: currentAuthUser, error: fetchAuthUserError } = await supabase.auth.admin.getUserById(initialData.id);
      const hasAuthUser = !fetchAuthUserError && currentAuthUser.user !== null;

      if (hasAuthUser) {
        // User has an auth.users entry, update it
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(initialData.id, {
          email: email,
          data: { full_name: name, avatar_url: userImageUrl },
        });

        if (authUpdateError) {
          console.error("Error updating Supabase Auth user:", authUpdateError);
          showError("Failed to update user authentication details.");
          setIsSaving(false);
          return;
        }

        // If login was disabled and is now enabled, and they haven't set a password, send invite
        if (newEnableLogin && !oldEnableLogin) {
          const userAuthData = currentAuthUser.user;
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
        // User does NOT have an auth.users entry (non-login member)
        if (newEnableLogin && !oldEnableLogin) {
          showError("To enable login for this member, please create a new user account with login enabled and then manually transfer any existing data. Direct conversion is not supported.");
          setIsSaving(false);
          return;
        }
      }

      // Update public.profiles table
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          role,
          status,
          enable_login: newEnableLogin,
          image_url: userImageUrl
        })
        .eq('id', initialData.id);

      if (profileUpdateError) {
        console.error("Error updating user profile:", profileUpdateError);
        showError("Failed to update user profile details.");
        setIsSaving(false);
        return;
      }
      showSuccess("User updated successfully!");

    } else {
      // Adding new user
      if (enableLogin) {
        // Create user in Supabase Auth. The handle_new_user trigger will create the profile.
        const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
          email: email,
          user_metadata: {
            full_name: name,
            avatar_url: userImageUrl,
            role: role,
            status: status,
            enable_login: enableLogin,
          },
        });

        if (createUserError) {
          console.error("Error creating new user in Auth:", createUserError);
          showError(`Failed to add new user: ${createUserError.message}`);
          setIsSaving(false);
          return;
        }

        if (userData.user) {
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: window.location.origin + '/login',
          });
          if (inviteError) {
            console.error("Error sending invitation email:", inviteError);
            showError(`User created, but failed to send invitation email: ${inviteError.message}`);
          } else {
            showSuccess("User added and invitation email sent successfully!");
          }
        }
      } else {
        // Add member directly to public.profiles without creating an auth.users entry
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            name: name,
            email: email,
            role: role,
            status: status,
            enable_login: false, // Explicitly false for non-login members
            image_url: userImageUrl,
          });

        if (createProfileError) {
          console.error("Error adding non-login user to profiles:", createProfileError);
          showError(`Failed to add non-login user: ${createProfileError.message}`);
          setIsSaving(false);
          return;
        }
        showSuccess("Non-login user added successfully!");
      }
    }
    
    onSave();
    setIsOpen(false);
    setIsSaving(false);
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
                disabled={!canManageUserProfiles || isSaving}
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
              disabled={!canManageUserProfiles || isSaving}
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
              disabled={!canManageUserProfiles || isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select 
              value={role} 
              onValueChange={(value: string) => setRole(value)} 
              disabled={!canManageUserProfiles || isSaving}
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
              disabled={!canManageUserProfiles || isSaving}
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
              onCheckedChange={(checked) => setEnableLogin(checked as boolean)} 
              className="col-span-3" 
              disabled={!canManageUserProfiles || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!canManageUserProfiles || isSaving}
          >
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add User"}</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: If "Enable Login" is checked, an invitation email will be sent to the user to set their password. For existing users, password resets must be initiated separately.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserDialog;