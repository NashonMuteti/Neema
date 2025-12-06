"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle, XCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

interface CustomField {
  id: string;
  name: string;
  type: string; // e.g., "text", "number", "date", "select"
}

const MemberFieldCustomization = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageMemberFields = currentUserPrivileges.includes("Manage Member Fields");

  const [customFields, setCustomFields] = React.useState<CustomField[]>([
    { id: "f1", name: "Phone Number", type: "text" },
    { id: "f2", name: "Role", type: "text" },
  ]);
  const [newFieldName, setNewFieldName] = React.useState("");

  const handleAddField = () => {
    if (newFieldName.trim() === "") {
      showError("Field name cannot be empty.");
      return;
    }
    const newField: CustomField = {
      id: `f${customFields.length + 1}`,
      name: newFieldName.trim(),
      type: "text", // Default to text for now
    };
    setCustomFields((prev) => [...prev, newField]);
    setNewFieldName("");
    showSuccess("Custom field added.");
  };

  const handleRemoveField = (id: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== id));
    showSuccess("Custom field removed.");
  };

  const handleSaveFields = () => {
    // In a real app, this would save the custom fields configuration to the backend
    console.log("Saving custom member fields:", customFields);
    showSuccess("Member fields configuration saved.");
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Member Field Customization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Define custom fields for member profiles. These fields will appear when adding or editing members.
        </p>

        <div className="space-y-4">
          {customFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between gap-2">
              <Label className="flex-1">{field.name} ({field.type})</Label>
              {canManageMemberFields && (
                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(field.id)}>
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              placeholder="New field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="flex-1"
              disabled={!canManageMemberFields}
            />
            {canManageMemberFields && (
              <Button onClick={handleAddField} size="icon">
                <PlusCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          {canManageMemberFields && (
            <Button onClick={handleSaveFields} className="mt-4">Save Field Configuration</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberFieldCustomization;