"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

// Define the schema for form validation
const userSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  receiveNotifications: z.boolean(),
});

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters long").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

const UserSettings = () => {
  const { currentUser, setCurrentUser } = useAuth(); // Use currentUser from AuthContext

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset: resetUserSettingsForm,
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      receiveNotifications: currentUser?.receiveNotifications ?? true, // Default to true if undefined
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    // Update form defaults when currentUser changes
    resetUserSettingsForm({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      receiveNotifications: currentUser?.receiveNotifications ?? true,
    });
  }, [currentUser, resetUserSettingsForm]);

  const onSubmitUserSettings = async (data: UserSettingsFormValues) => {
    if (!currentUser) {
      showError("No user logged in.");
      return;
    }

    // In a real app, this would send updated settings to the backend
    // For Supabase, you'd update the user metadata or a profiles table
    const { data: updatedUser, error } = await supabase.auth.updateUser({
      data: {
        name: data.name,
        // You might have other profile fields here
      },
    });

    if (error) {
      showError("Failed to update profile: " + error.message);
      console.error("Profile update error:", error);
    } else {
      // Update the AuthContext with the new user data
      if (updatedUser.user) {
        setCurrentUser({
          ...currentUser,
          name: updatedUser.user.user_metadata.name || data.name,
          email: updatedUser.user.email || data.email,
          // Assuming receiveNotifications is not directly in Supabase auth user_metadata
          // You'd typically store this in a separate 'profiles' table
          // For now, we'll just update the local state if it's part of currentUser
          receiveNotifications: data.receiveNotifications,
        });
      }
      showSuccess("Personal information saved successfully!");
    }
  };

  const onSubmitPasswordChange = async (data: PasswordChangeFormValues) => {
    if (!data.newPassword) {
      showError("Please enter a new password.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (error) {
      showError("Failed to change password: " + error.message);
      console.error("Password change error:", error);
    } else {
      showSuccess("Password changed successfully!");
      resetPasswordForm(); // Clear password fields
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage your personal account information and preferences.
      </p>

      <form onSubmit={handleSubmit(onSubmitUserSettings)} className="space-y-6">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} disabled />
              <p className="text-sm text-muted-foreground">Email cannot be changed here.</p>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between w-full max-w-sm">
              <Label htmlFor="notifications">Receive Email Notifications</Label>
              <Controller
                name="receiveNotifications"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="notifications"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <Button type="submit">Save Preferences</Button>
          </CardContent>
        </Card>
      </form>

      {/* Password Change Section */}
      <form onSubmit={handleSubmitPassword(onSubmitPasswordChange)} className="space-y-6">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...registerPassword("newPassword")} />
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
              )}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" {...registerPassword("confirmPassword")} />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit">Update Password</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UserSettings;