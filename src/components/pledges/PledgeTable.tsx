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
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import EditPledgeDialog, { Pledge as EditPledgeDialogPledge } from "./EditPledgeDialog";
import MarkPledgeAsPaidDialog from "./MarkPledgeAsPaidDialog"; // New import
import { Member, FinancialAccount, Pledge } from "@/types/common"; // Updated Pledge import

interface Project {
  id: string;
  name: string;
}

interface PledgeTableProps {
  pledges: Pledge[];
  canManagePledges: boolean;
  onMarkAsPaid: (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => void; // Updated signature
  onEditPledge: (updatedPledge: EditPledgeDialogPledge) => void;
  onDeletePledge: (id: string) => void;
  members: Member[];
  projects: Project[];
  financialAccounts: FinancialAccount[];
}

const getDisplayPledgeStatus = (pledge: Pledge): "Paid" | "Unpaid" => {
  if (pledge.paid_amount >= pledge.original_amount) return "Paid";
  return "Unpaid";
};

const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid") => {
  switch (displayStatus) {
    case "Paid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Unpaid":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
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
  members,
  projects,
  financialAccounts,
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
              <TableHead className="text-right">Pledged</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Comments</TableHead>
              {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pledges.map((pledge) => {
              const displayStatus = getDisplayPledgeStatus(pledge);
              const remaining = pledge.original_amount - pledge.paid_amount;
              return (
                <TableRow key={pledge.id}>
                  <TableCell className="font-medium">{pledge.member_name}</TableCell>
                  <TableCell>{pledge.project_name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{pledge.original_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{pledge.paid_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{remaining.toFixed(2)}</TableCell>
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
                        {displayStatus !== "Paid" && (
                          <MarkPledgeAsPaidDialog
                            pledge={pledge}
                            onConfirmPayment={onMarkAsPaid}
                            financialAccounts={financialAccounts}
                            canManagePledges={canManagePledges}
                          />
                        )}
                        <EditPledgeDialog
                          initialData={pledge as EditPledgeDialogPledge}
                          onSave={onEditPledge}
                          members={members}
                          projects={projects}
                          financialAccounts={financialAccounts}
                        />
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