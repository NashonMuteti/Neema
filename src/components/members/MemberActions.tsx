"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet } from "lucide-react";
import AddMemberDialog from "./AddMemberDialog";

interface MemberActionsProps {
  canExportPdf: boolean;
  canExportExcel: boolean;
  canAddMember: boolean;
  onPrintPdf: () => void;
  onExportExcel: () => void;
  onAddMember: () => void;
}

const MemberActions: React.FC<MemberActionsProps> = ({
  canExportPdf,
  canExportExcel,
  canAddMember,
  onPrintPdf,
  onExportExcel,
  onAddMember,
}) => {
  return (
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
      {canAddMember && (
        <AddMemberDialog onAddMember={onAddMember} />
      )}
    </div>
  );
};

export default MemberActions;