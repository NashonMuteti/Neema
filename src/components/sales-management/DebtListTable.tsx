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
import { format, isPast, isSameDay } from "date-fns"; // Added isSameDay import
import { Edit, Trash2, DollarSign } from "lucide-react";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Debt } from "./AddEditDebtDialog"; // Import Debt interface
import RecordDebtPaymentDialog from "./RecordDebtPaymentDialog"; // Import payment dialog
import { FinancialAccount } from "@/types/common";

interface DebtListTableProps {
  debts: Debt[];
  canManageDebts: boolean;
  onEditDebt: (debt: Debt) => void;
  onDeleteDebt: (debtId: string) => void;
  onRecordPayment: (paymentData: {
    debtId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    receivedIntoAccountId: string;
    notes?: string;
  }) => Promise<void>;
  financialAccounts: FinancialAccount[];
  isProcessing: boolean;
}

const getStatusBadgeClasses = (status: Debt['status'], dueDate?: Date) => {
  const today = new Date();
  const isOverdue = dueDate && isPast(dueDate) && status !== "Paid";

  if (isOverdue) {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Partially Paid":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "Outstanding":
    case "Overdue": // Handled by isOverdue check above
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }
};

const getDisplayStatus = (status: Debt['status'], dueDate?: Date): Debt['status'] => {
  const today = new Date();
  if (status !== "Paid" && dueDate && isPast(dueDate) && !isSameDay(dueDate, today)) {
    return "Overdue";
  }
  return status;
};

const DebtListTable: React.FC<DebtListTableProps> = ({
  debts,
  canManageDebts,
  onEditDebt,
  onDeleteDebt,
  onRecordPayment,
  financialAccounts,
  isProcessing,
}) => {
  const { currency } = useSystemSettings();
  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = React.useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = React.useState<Debt | undefined>(undefined);

  const openRecordPaymentDialog = (debt: Debt) => {
    setSelectedDebtForPayment(debt);
    setIsRecordPaymentDialogOpen(true);
  };

  return (
    <>
      {debts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Debtor</TableHead>
              <TableHead className="text-right">Original Amount</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Notes</TableHead>
              {canManageDebts && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => {
              const displayStatus = getDisplayStatus(debt.status, debt.due_date);
              const debtorName = debt.debtor_name || debt.customer_name || "N/A";
              const isFullyPaid = debt.amount_due <= 0;

              return (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">{debt.description}</TableCell>
                  <TableCell>{debtorName}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{debt.original_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{debt.amount_due.toFixed(2)}</TableCell>
                  <TableCell>{debt.due_date ? format(debt.due_date, "MMM dd, yyyy") : "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusBadgeClasses(displayStatus, debt.due_date)}>
                      {displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{debt.notes || "-"}</TableCell>
                  {canManageDebts && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        {!isFullyPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRecordPaymentDialog(debt)}
                            disabled={isProcessing}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onEditDebt(debt)} disabled={isProcessing}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteDebt(debt.id)} disabled={isProcessing}>
                          <Trash2 className="h-4 w-4" />
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
        <p className="text-muted-foreground text-center mt-4">No debts found matching your search or filters.</p>
      )}

      {selectedDebtForPayment && (
        <RecordDebtPaymentDialog
          isOpen={isRecordPaymentDialogOpen}
          setIsOpen={setIsRecordPaymentDialogOpen}
          debt={selectedDebtForPayment}
          onRecordPayment={onRecordPayment}
          canManageDebts={canManageDebts}
          financialAccounts={financialAccounts}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
};

export default DebtListTable;