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
import { showSuccess } from "@/utils/toast";

// Define the schema for form validation
const userSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  receiveNotifications: z.boolean(),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

const UserSettings = () => {
  // Placeholder for user data, will be replaced with actual user context
  const currentUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    receiveNotifications: true,
    themePreference: "system",
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: currentUser.name,
      email: currentUser.email,
      receiveNotifications: currentUser.receiveNotifications,
    },
  });

  const onSubmit = (data: UserSettingsFormValues) => {
    // In a real app, this would send updated settings to the backend
    console.log("Saving user settings:", data);
    showSuccess("Settings saved successfully!");
  };

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