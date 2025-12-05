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

interface AddMemberDialogProps {
  onAddMember: (memberData: { name: string; email: string; enableLogin: boolean; defaultPassword?: string }) => void;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ onAddMember }) => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [enableLogin, setEnableLogin] = React.useState(false);
  const [defaultPassword, setDefaultPassword] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSubmit = () => {
    if (!name || !email) {
      showError("Name and Email are required.");
      return;
    }
    if (enableLogin && !defaultPassword) {
      showError("Default password is required if login is enabled.");
      return;
    }

    onAddMember({ name, email, enableLogin, defaultPassword: enableLogin ? defaultPassword : undefined });
    showSuccess("Member added successfully!");
    setIsOpen(false);
    setName("");
    setEmail("");
    setEnableLogin(false);
    setDefaultPassword("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Member</Button>
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
                Default Password
              </Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Member</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Enabling login and setting passwords requires a backend authentication system (e.g., Supabase).
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;