"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

const availableReportFields = [
  { value: "name-email", label: "Name, Email" },
  { value: "name-email-status", label: "Name, Email, Status" },
  { value: "all-fields", label: "All Member Fields" },
];

const availableExportFormats = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel (XLSX)" },
  { value: "csv", label: "CSV" },
];

const ReportsTemplateCustomization = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageReportsTemplates = currentUserPrivileges.includes("Manage Reports Templates");

  const [selectedPledgeReportFields, setSelectedPledgeReportFields] = React.useState("name-email-status");
  const [defaultExportFormat, setDefaultExportFormat] = React.useState("pdf");

  const handleSaveReportSettings = () => {
    // In a real app, this would send the settings to the backend
    console.log("Saving report template settings:", { selectedPledgeReportFields, defaultExportFormat });
    showSuccess("Report template settings saved successfully!");
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Reports Template Customization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Customize the templates and data displayed in various reports.
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="pledge-report-fields">Pledge Report Fields</Label>
            <Select value={selectedPledgeReportFields} onValueChange={setSelectedPledgeReportFields} disabled={!canManageReportsTemplates}>
              <SelectTrigger id="pledge-report-fields">
                <SelectValue placeholder="Select fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Fields</SelectLabel>
                  {availableReportFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="export-format">Default Export Format</Label>
            <Select value={defaultExportFormat} onValueChange={setDefaultExportFormat} disabled={!canManageReportsTemplates}>
              <SelectTrigger id="export-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Formats</SelectLabel>
                  {availableExportFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveReportSettings} disabled={!canManageReportsTemplates}>
            <Save className="mr-2 h-4 w-4" /> Save Report Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsTemplateCustomization;