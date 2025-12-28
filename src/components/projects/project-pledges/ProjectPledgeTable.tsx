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

interface ProjectPledgeTableProps {
  pledges: Pledge[];
  canManagePledges: boolean;
  onMarkAsPaid: (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => Promise<void>;
  onDeletePledge: (pledgeId: string) => Promise<void>;
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

const ProjectPledgeTable: React.FC<ProjectPledgeTableProps> = ({
  pledges,
  canManagePledges,
  onMarkAsPaid,
  onDeletePledge,
  financialAccounts,
  currency,
  isProcessing,
}) => {
  return (
    <>
      <h3 className="text-lg font-semibold mb-2">Existing Pledges</h3>
      {pledges.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Pledged</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pledges.map((pledge) => {
              const displayStatus = getDisplayPledgeStatus(pledge);
              const remainingAmount = pledge.original_amount - pledge.paid_amount;
              return (
                <TableRow key={pledge.id}>
                  <TableCell>{pledge.member_name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{pledge.original_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{pledge.paid_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{remainingAmount.toFixed(2)}</TableCell>
                  <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeClasses(displayStatus)}>
                      {displayStatus}
                    </Badge>
                  </TableCell>
                  {canManagePledges && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        {remainingAmount > 0 && (
                          <MarkPledgeAsPaidDialog
                            pledge={pledge}
                            onConfirmPayment={onMarkAsPaid}
                            financialAccounts={financialAccounts}
                            canManagePledges={canManagePledges}
                            isProcessing={isProcessing}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePledge(pledge.id)}
                          disabled={!canManagePledges || isProcessing}
                        >
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
        <p className="text-muted-foreground text-center">No pledges found for this project.</p>
      )}
    </>
  );
};

export default ProjectPledgeTable;