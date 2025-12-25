"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid" | "Overdue"; // Database status
  member_name: string;
  project_name: string;
  comments?: string; // Added comments
}

interface PledgeTableProps {
  pledges: Pledge[];
  canManagePledges: boolean;
  onMarkAsPaid: (id: string, memberName: string, amount: number) => void;
  onEditPledge: (id: string) => void;
  onDeletePledge: (id: string) => void;
}

// Helper to determine display status
const getDisplayPledgeStatus = (pledge: Pledge): "Paid" | "Unpaid" => {
  if (pledge.status === "Paid") return "Paid";
  return "Unpaid"; // Active and Overdue are now considered Unpaid
};

const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid") => {
  switch (displayStatus) {
    case "Paid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Unpaid":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; // Active/Overdue now red for Unpaid
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const PledgeTable: React.FC<PledgeTableProps> = ({
  pledges,
  canManagePledges,
  onMarkAsPaid,
  onEditPledge,
  onDeletePledge,
}) => {
  const { currency } = useSystemSettings();

  return (
    <>
      {pledges.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Comments</TableHead>
              {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pledges.map((pledge) => {
              const displayStatus = getDisplayPledgeStatus(pledge);
              return (
                <TableRow key={pledge.id}>
                  <TableCell className="font-medium">{pledge.member_name}</TableCell>
                  <TableCell>{pledge.project_name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{pledge.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeClasses(displayStatus)}>
                      {displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{pledge.comments || "-"}</TableCell>
                  {canManagePledges && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        {displayStatus !== "Paid" && ( // Only show Mark as Paid if not already Paid
                          <Button variant="outline" size="icon" onClick={() => onMarkAsPaid(pledge.id, pledge.member_name, pledge.amount)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onEditPledge(pledge.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeletePledge(pledge.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center mt-4">No pledges found for the selected period or matching your search.</p>
      )}
    </>
  );
};

export default PledgeTable;