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
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError } from "@/utils/toast";
import { Save } from "lucide-react";
import { navItems, NavItem, NavHeading, PrivilegeItem } from "@/components/Sidebar"; // Import NavItem, NavHeading, and PrivilegeItem

export interface UserRole {
  id: string;
  name: string;
  description: string;
  memberUserIds: string[]; // IDs of users belonging to this role
  menuPrivileges: string[]; // New: Names of menu items this role has access to
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
  const [selectedMenuPrivileges, setSelectedMenuPrivileges] = React.useState<string[]>(initialData?.menuPrivileges || []);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
      setSelectedMenuPrivileges(initialData?.menuPrivileges || []);
    }
  }, [isOpen, initialData]);

  const handlePrivilegeChange = (itemName: string, checked: boolean) => {
    setSelectedMenuPrivileges((prev) =>
      checked ? [...prev, itemName] : prev.filter((name) => name !== itemName)
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      showError("Role Name is required.");
      return;
    }

    const roleData: Omit<UserRole, 'id'> & { id?: string } = {
      name: name.trim(),
      description: description.trim(),
      memberUserIds: initialData?.memberUserIds || [], // Preserve existing members or start empty
      menuPrivileges: selectedMenuPrivileges, // Include selected privileges
    };

    if (initialData?.id) {
      roleData.id = initialData.id;
    }

    onSave(roleData);
    showSuccess(`User role ${initialData ? "updated" : "added"} successfully!`);
    setIsOpen(false);
  };

  // Flatten all possible privilege names from navItems for display in the dialog
  const allPrivilegeNames = React.useMemo(() => {
    const privileges: string[] = [];
    navItems.forEach(item => {
      if (item.type === "privilege") {
        privileges.push(item.name);
      } else if (item.type === "item") {
        if (item.requiredPrivileges) {
          privileges.push(...item.requiredPrivileges);
        } else {
          // If an item has no requiredPrivileges, its name itself can be a privilege
          privileges.push(item.name);
        }
      } else if (item.type === "heading") {
        if (item.requiredPrivileges) {
          privileges.push(...item.requiredPrivileges);
        } else {
          // If a heading has no requiredPrivileges, its name itself can be a privilege
          privileges.push(item.name);
        }
        item.children.forEach(child => {
          if (child.requiredPrivileges) {
            privileges.push(...child.requiredPrivileges);
          } else {
            privileges.push(child.name);
          }
        });
      }
    });
    // Ensure uniqueness and sort for consistent display
    return Array.from(new Set(privileges)).sort();
  }, []);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          <div className="col-span-full mt-4">
            <h3 className="text-lg font-semibold mb-2">Menu Privileges</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the specific privileges this role should have.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {allPrivilegeNames.map((privilegeName) => (
                <div key={privilegeName} className="flex items-center space-x-2">
                  <Checkbox
                    id={`privilege-${privilegeName}`}
                    checked={selectedMenuPrivileges.includes(privilegeName)}
                    onCheckedChange={(checked) => handlePrivilegeChange(privilegeName, checked as boolean)}
                  />
                  <Label htmlFor={`privilege-${privilegeName}`} className="text-sm font-normal cursor-pointer">
                    {privilegeName}
                  </Label>
                </div>
              ))}
            </div>
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