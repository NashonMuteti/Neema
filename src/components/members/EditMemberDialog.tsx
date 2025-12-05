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
import { showSuccess, showError } from "@/utils/toast"; // Assuming toast utility

interface Member {
  id: string;
  name: string;
  email: string;
  enableLogin: boolean;
  imageUrl?: string; // Added optional imageUrl
  // Add other member fields as needed
}

interface EditMemberDialogProps {
  member: Member;
  onEditMember: (memberData: Member) => void;
}

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ member, onEditMember }) => {
  const [name, setName] = React.useState(member.name);
  const [email, setEmail] = React.useState(member.email);
  const [imageUrl, setImageUrl] = React.useState(member.imageUrl || ""); // New state for image URL
  const [enableLogin, setEnableLogin] = React.useState(member.enableLogin);
  const [defaultPassword, setDefaultPassword] = React.useState(""); // For resetting password
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(member.name);
      setEmail(member.email);
      setImageUrl(member.imageUrl || ""); // Reset image URL on open
      setEnableLogin(member.enableLogin);
      setDefaultPassword(""); // Clear password field on open
    }
  }, [isOpen, member]);

  const handleSubmit = () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    // Password is only required if login is enabled AND a new password is being set
    // For simplicity, we'll assume if defaultPassword is not empty, it's a reset.
    // In a real app, you'd have separate "reset password" functionality.

    onEditMember({ ...member, name, email, enableLogin, imageUrl: imageUrl || undefined });
    showSuccess("Member updated successfully!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Make changes to {member.name}'s profile.
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
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUrl" className="text-right">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Optional image URL"
              className="col-span-3"
            />
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
            />
          </div>
          {enableLogin && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultPassword" className="text-right">
                Reset Password
              </Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="col-span-3"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Enabling login and setting/resetting passwords requires a backend authentication system (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;