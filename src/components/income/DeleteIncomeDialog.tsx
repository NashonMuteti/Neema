"use client";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns"; // <--- Added this import

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  profile_id: string;
  account_name: string;
}

interface DeleteIncomeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  transaction: IncomeTransaction;
  onConfirm: () => void;
  currency: { code: string; symbol: string };
}

const DeleteIncomeDialog: React.FC<DeleteIncomeDialogProps> = ({
  isOpen,
  setIsOpen,
  transaction,
  onConfirm,
  currency,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the income transaction of{" "}
            <span className="font-semibold">{currency.symbol}{transaction.amount.toFixed(2)}</span> from{" "}
            <span className="font-semibold">{transaction.source}</span> on{" "}
            <span className="font-semibold">{format(transaction.date, "MMM dd, yyyy")}</span>.
            The associated account balance will also be adjusted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteIncomeDialog;