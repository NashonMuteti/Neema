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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Define the schema for form validation
const userSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  receiveNotifications: z.boolean(),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

const UserSettings = () => {
  const { currentUser, supabaseUser, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      receiveNotifications: true, // Default to true, will be loaded from profile later
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      reset({
        name: currentUser.name,
        email: currentUser.email,
        receiveNotifications: true, // Placeholder, needs to come from profile
      });
    }
  }, [currentUser, reset]);

  const onSubmit = async (data: UserSettingsFormValues) => {
    if (!currentUser || !supabaseUser) {
      console.error("No current user to update settings for.");
      showError("User not logged in.");
      return;
    }

    // Update Supabase auth user metadata (for full_name)
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: data.name },
    });

    if (authUpdateError) {
      console.error("Error updating user metadata:", authUpdateError);
      showError("Failed to update user name in authentication.");
      return;
    }

    // Update public.profiles table (for name, and other profile-specific settings like notifications)
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ 
        name: data.name,
        // TODO: Add 'receive_notifications' column to public.profiles table
        // and update its value here: receive_notifications: data.receiveNotifications
      })
      .eq('id', currentUser.id);

    if (profileUpdateError) {
      console.error("Error updating user profile:", profileUpdateError);
      showError("Failed to update user profile details.");
      return;
    }

    showSuccess("Settings saved successfully!");
    // A full refresh of AuthContext might be needed to reflect changes immediately
    // For now, the next page load or manual refresh will pick up changes.
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Settings</h1>
        <p className="text-lg text-muted-foreground">Loading user settings...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Settings</h1>
        <p className="text-lg text-destructive">User not logged in. Please log in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Settings</h1>
      <p className="text-lg text-muted-foreground">
        Manage your personal account information and preferences.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            {/* Theme preference is handled by the ThemeToggle in the header */}
            <Button type="submit">Save Preferences</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UserSettings;