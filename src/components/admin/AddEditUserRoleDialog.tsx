"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Save } from "lucide-react";

export interface UserRole {
  id: string;
  name: string;
  description: string;
  memberUserIds: string[]; // IDs of users belonging to this role
}

interface AddEditUserRoleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: UserRole; // For editing existing role
  onSave: (role: Omit<UserRole, 'id'> & { id?: string }) => void;
}

const AddEditUserRoleDialog: React.FC<AddEditUserRoleDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
}) => {
  const [name, setName] = React.useState(initialData?.name || "");
  const [description, setDescription] = React.useState(initialData?.description || "");

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      showError("Role Name is required.");
      return;
    }

    const roleData: Omit<UserRole, 'id'> & { id?: string } = {
      name: name.trim(),
      description: description.trim(),
      memberUserIds: initialData?.memberUserIds || [], // Preserve existing members or start empty
    };

    if (initialData?.id) {
      roleData.id = initialData.id;
    }

    onSave(roleData);
    showSuccess(`User role ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit User Role" : "Add New User Role"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to the ${initialData.name} role.` : "Define a new role for managing user rights."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role-name" className="text-right">
              Role Name
            </Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="role-description" className="text-right">
              Description
            </Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Briefly describe the purpose or permissions of this role."
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditUserRoleDialog;