"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Printer, FileSpreadsheet } from "lucide-react";
import AddMemberDialog from "./AddMemberDialog";

interface MemberActionsProps {
  canExportPdf: boolean;
  canExportExcel: boolean;
  canAddMember: boolean;
  onPrintPdf: () => void;
  onExportExcel: () => void;
  onAddMember: () => void;
  maskPersonalData: boolean;
  onMaskPersonalDataChange: (value: boolean) => void;
}

const MemberActions: React.FC<MemberActionsProps> = ({
  canExportPdf,
  canExportExcel,
  canAddMember,
  onPrintPdf,
  onExportExcel,
  onAddMember,
  maskPersonalData,
  onMaskPersonalDataChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
        <Switch
          id="mask-member-personal-data"
          checked={maskPersonalData}
          onCheckedChange={onMaskPersonalDataChange}
        />
        <Label htmlFor="mask-member-personal-data" className="text-sm">
          Mask email/phone
        </Label>
      </div>

      <div className="flex gap-2">
        {canExportPdf && (
          <Button variant="outline" onClick={onPrintPdf}>
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>
        )}
        {canExportExcel && (
          <Button variant="outline" onClick={onExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        )}
        {canAddMember && <AddMemberDialog onAddMember={onAddMember} />}
      </div>
    </div>
  );
};

export default MemberActions;