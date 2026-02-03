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
import { fileUploadSchema } from "@/utils/security";
import { fileToBase64 } from "@/utils/imageUtils"; // New import

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
  const { currentUser: loggedInUser, session } = useAuth(); // Get session for Edge Function auth
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
  const [base64Image, setBase64Image] = React.useState<string | null>(null); // State for Base64 image
  const [isSaving, setIsSaving] = React.useState(false);

  // Board member linkage (optional)
  const [createBoardMemberProfile, setCreateBoardMemberProfile] = React.useState(false);
  const [boardMemberPhone, setBoardMemberPhone] = React.useState("");
  const [boardMemberTitle, setBoardMemberTitle] = React.useState("Board Member");

  const isBoardMemberRole = role === "Board Member";

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setRole(initialData?.role || (availableRoles.length > 0 ? availableRoles[0].name : ""));
      setStatus(initialData?.status || "Active");
      setEnableLogin(initialData?.enableLogin || false);
      setSelectedFile(null); // Clear selected file on open
      setBase64Image(null); // Clear Base64 image on open

      // Reset board member fields
      setCreateBoardMemberProfile(false);
      setBoardMemberPhone("");
      setBoardMemberTitle("Board Member");
    }
  }, [isOpen, initialData, availableRoles]);

  const upsertBoardMemberByEmail = async (args: {
    name: string;
    email: string;
    phone: string;
    title: string;
    imageUrl?: string;
  }) => {
    const { data: existing, error: existingError } = await supabase
      .from("board_members")
      .select("id")
      .eq("email", args.email)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking board member by email:", existingError);
      return;
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("board_members")
        .update({
          name: args.name,
          role: args.title,
          email: args.email,
          phone: args.phone,
          image_url: args.imageUrl,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating board member:", updateError);
      }
      return;
    }

    const { error: insertError } = await supabase.from("board_members").insert({
      name: args.name,
      role: args.title,
      email: args.email,
      phone: args.phone,
      image_url: args.imageUrl,
    });

    if (insertError) {
      console.error("Error inserting board member:", insertError);
    }
  };

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

  // Determine the URL to display: base64Image if present, otherwise initialData?.imageUrl
  const displayImageUrl = base64Image || initialData?.imageUrl || null;

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

    if (!role) {
      showError("User Role is required.");
      return;
    }

    if (isBoardMemberRole && createBoardMemberProfile && !boardMemberPhone) {
      showError("Board Member phone is required when creating a board member profile.");
      return;
    }

    if (!session) {
      showError("You must be logged in to perform this action.");
      return;
    }
    
    setIsSaving(true);
    let userImageUrl: string | undefined = initialData?.imageUrl;
    if (selectedFile) {
      const filePath = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const uploadedUrl = await uploadFileToSupabase('avatars', selectedFile, filePath);
      if (uploadedUrl) {
        userImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    } else if (!selectedFile && initialData?.imageUrl && !base64Image) {
      userImageUrl = undefined;
    }
    
    try {
      if (initialData?.id) {
        // Editing existing user
        const oldEnableLogin = initialData.enableLogin;
        const newEnableLogin = enableLogin;

        // If trying to enable login for a user who previously didn't have it
        if (newEnableLogin && !oldEnableLogin) {
          showError("Cannot enable login for an existing non-login member. Please delete this member and re-add them with 'Enable Login' checked.");
          setIsSaving(false);
          return;
        }

        // If the user had login enabled (or still has it enabled)
        if (oldEnableLogin || newEnableLogin) {
          // Update Supabase auth user metadata via Edge Function
          const { error: authUpdateError } = await supabase.functions.invoke('manage-user-auth', {
            body: JSON.stringify({
              action: 'updateUserById',
              payload: {
                userId: initialData.id,
                updates: {
                  email: email,
                  user_metadata: { full_name: name, avatar_url: userImageUrl },
                },
              },
            }),
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (authUpdateError) {
            console.error("Error updating Supabase Auth user via Edge Function:", authUpdateError);
            showError(`Failed to update user authentication details: ${authUpdateError.message}`);
            setIsSaving(false);
            return;
          }
        }

        // Always update public.profiles table
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

        if (isBoardMemberRole && createBoardMemberProfile) {
          await upsertBoardMemberByEmail({
            name,
            email,
            phone: boardMemberPhone,
            title: boardMemberTitle || "Board Member",
            imageUrl: userImageUrl,
          });
        }

        showSuccess("User updated successfully!");

      } else {
        // Adding new user
        if (enableLogin) {
          // Create user in Supabase Auth via Edge Function
          const { data: createUserResponse, error: createUserError } = await supabase.functions.invoke('manage-user-auth', {
            body: JSON.stringify({
              action: 'createUser',
              payload: {
                email: email,
                password: Math.random().toString(36).substring(2, 15),
                user_metadata: {
                  full_name: name,
                  avatar_url: userImageUrl,
                  role: role,
                  status: status,
                  enable_login: enableLogin,
                },
              },
            }),
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (createUserError) {
            console.error("Error creating new user in Auth via Edge Function:", createUserError);
            showError(`Failed to add new user: ${createUserError.message}`);
            setIsSaving(false);
            return;
          }

          if (createUserResponse?.user) {
            // Send invitation email via Edge Function
            const { error: inviteError } = await supabase.functions.invoke('manage-user-auth', {
              body: JSON.stringify({
                action: 'inviteUserByEmail',
                payload: {
                  email: email,
                  options: {
                    redirectTo: window.location.origin + '/login',
                  },
                },
              }),
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            });

            if (inviteError) {
              console.error("Error sending invitation email via Edge Function:", inviteError);
              showError(`User created, but failed to send invitation email: ${inviteError.message}`);
            } else {
              showSuccess("User added and invitation email sent successfully!");
            }

            if (isBoardMemberRole && createBoardMemberProfile) {
              await upsertBoardMemberByEmail({
                name,
                email,
                phone: boardMemberPhone,
                title: boardMemberTitle || "Board Member",
                imageUrl: userImageUrl,
              });
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
              enable_login: false,
              image_url: userImageUrl,
            });

          if (createProfileError) {
            console.error("Error adding non-login user to profiles:", createProfileError);
            showError(`Failed to add non-login user: ${createProfileError.message}`);
            setIsSaving(false);
            return;
          }

          if (isBoardMemberRole && createBoardMemberProfile) {
            await upsertBoardMemberByEmail({
              name,
              email,
              phone: boardMemberPhone,
              title: boardMemberTitle || "Board Member",
              imageUrl: userImageUrl,
            });
          }

          showSuccess("Non-login user added successfully!");
        }
      }
    } catch (err: any) {
      console.error("Unexpected error in handleSubmit:", err);
      showError(`An unexpected error occurred: ${err.message || 'Please try again.'}`);
    } finally {
      onSave();
      setIsOpen(false);
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit User Profile" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to ${initialData.name}'s profile.` : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4 col-span-full">
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="User Avatar Preview" className="w-24 h-24 object-cover rounded-full border" />
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
              disabled={!canManageUserProfiles || isSaving || (initialData && !initialData.enableLogin)}
            />
          </div>

          {isBoardMemberRole ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="createBoardMemberProfile" className="text-right">
                  Board Profile
                </Label>
                <div className="col-span-3 flex items-center gap-3">
                  <Checkbox
                    id="createBoardMemberProfile"
                    checked={createBoardMemberProfile}
                    onCheckedChange={(checked) => setCreateBoardMemberProfile(checked as boolean)}
                    disabled={!canManageUserProfiles || isSaving}
                  />
                  <span className="text-sm text-muted-foreground">
                    Create / update a record in the Board Members list
                  </span>
                </div>
              </div>

              {createBoardMemberProfile ? (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="boardMemberTitle" className="text-right">
                      Board Title
                    </Label>
                    <Input
                      id="boardMemberTitle"
                      value={boardMemberTitle}
                      onChange={(e) => setBoardMemberTitle(e.target.value)}
                      className="col-span-3"
                      disabled={!canManageUserProfiles || isSaving}
                      placeholder="e.g., Chairperson"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="boardMemberPhone" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="boardMemberPhone"
                      value={boardMemberPhone}
                      onChange={(e) => setBoardMemberPhone(e.target.value)}
                      className="col-span-3"
                      disabled={!canManageUserProfiles || isSaving}
                      placeholder="Phone number"
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!canManageUserProfiles || isSaving || (initialData && !initialData.enableLogin && enableLogin)}
          >
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add User"}</>}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: If "Enable Login" is checked, an invitation email will be sent to the user to set their password.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserDialog;