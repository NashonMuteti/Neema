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
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, Save } from "lucide-react";

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
}

interface AddEditBoardMemberDialogProps {
  initialData?: BoardMember; // For editing existing member
  onSave: (member: Omit<BoardMember, 'id'> & { id?: string }) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AddEditBoardMemberDialog: React.FC<AddEditBoardMemberDialogProps> = ({
  initialData,
  onSave,
  isOpen,
  setIsOpen,
}) => {
  const [name, setName] = React.useState(initialData?.name || "");
  const [role, setRole] = React.useState(initialData?.role || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [address, setAddress] = React.useState(initialData?.address || "");
  const [notes, setNotes] = React.useState(initialData?.notes || "");

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setRole(initialData?.role || "");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "");
      setAddress(initialData?.address || "");
      setNotes(initialData?.notes || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name || !role || !email || !phone) {
      showError("Name, Role, Email, and Phone are required.");
      return;
    }

    const memberData: Omit<BoardMember, 'id'> & { id?: string } = {
      name,
      role,
      email,
      phone,
      address: address || undefined,
      notes: notes || undefined,
    };

    if (initialData?.id) {
      memberData.id = initialData.id;
    }

    onSave(memberData);
    showSuccess(`Board member ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Board Member" : "Add New Board Member"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to ${initialData.name}'s details.` : "Enter the details for the new board member."}
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
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
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
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-3"
              placeholder="Optional address details"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Any additional notes"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditBoardMemberDialog;