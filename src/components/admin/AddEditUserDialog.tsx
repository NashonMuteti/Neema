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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialData?.imageUrl || null);

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
    
    let userImageUrl: string | undefined = initialData?.imageUrl;
    if (selectedFile && previewUrl) {
      userImageUrl = previewUrl;
    } else if (!selectedFile && !initialData?.imageUrl) {
      userImageUrl = undefined;
    }
    
    if (initialData?.id) {
      // Editing existing user in Supabase Auth and profiles table
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(initialData.id, {
        email: email,
        user_metadata: {
          full_name: name,
          avatar_url: userImageUrl,
        },
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
      // Add new user to Supabase Auth and profiles table using admin.createUser
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Automatically confirm email for admin-created users
        user_metadata: {
          full_name: name,
          avatar_url: userImageUrl,
        },
        emailRedirectTo: window.location.origin + '/login', // emailRedirectTo is a direct property
      } as any); // Cast to any to bypass strict type checking for this specific property
      
      if (createUserError) {
        console.error("Error creating new user:", createUserError);
        showError(`Failed to add new user: ${createUserError.message}`);
        return;
      }
      
      if (userData.user) {
        // Update the profile with the selected role and status
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            role,
            status,
            enable_login: enableLogin
          })
          .eq('id', userData.user.id);
          
        if (profileUpdateError) {
          console.error("Error updating new user's profile with role/status:", profileUpdateError);
          showError("Failed to set new user's role and status.");
          return;
        }
      }
    }
    
    onSave();
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
              onCheckedChange={(checked) => setEnableLogin(checked as boolean)} 
              className="col-span-3" 
              disabled={!canManageUserProfiles}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!canManageUserProfiles}
          >
            <Save className="mr-2 h-4 w-4" />
            {initialData ? "Save Changes" : "Add User"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: For new users, an email will be sent to set their password. For existing users, password resets must be initiated separately.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserDialog;