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
import { format } from "date-fns";
import MarkPledgeAsPaidDialog from "@/components/pledges/MarkPledgeAsPaidDialog";
import { FinancialAccount, Pledge } from "@/types/common";
import { Trash2 } from "lucide-react";
import EditPledgeDialog, { Pledge as EditPledgeDialogPledge } from "@/components/pledges/EditPledgeDialog"; // Import EditPledgeDialog

interface PledgeListTableProps { // Renamed interface
  pledges: Pledge[];
  canManagePledges: boolean;
  onMarkAsPaid: (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => Promise<void>;
  onDeletePledge: (pledgeId: string) => Promise<void>;
  onEditPledge: (updatedPledge: EditPledgeDialogPledge) => void; // Added onEditPledge
  financialAccounts: FinancialAccount[];
  currency: { code: string; symbol: string };
  isProcessing: boolean;
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

const PledgeListTable: React.FC<PledgeListTableProps> = ({ // Using the new interface
  pledges,
  canManagePledges,
  onMarkAsPaid,
  onDeletePledge,
  onEditPledge, // Destructure new prop
  financialAccounts,
  currency,
  isProcessing,
}) => {
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
                            isProcessing={isProcessing}
                          />
                        )}
                        <EditPledgeDialog // Pass onEditPledge to the dialog
                          initialData={pledge as EditPledgeDialogPledge}
                          onSave={onEditPledge}
                          members={[]} // Members and projects are not directly needed by EditPledgeDialog, but it expects them.
                          projects={[]} // In a real app, these would be passed from a higher context or fetched within the dialog.
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

export default PledgeListTable;