"use client";

import React from "react";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Edit, Trash2 } from "lucide-react";

export interface IncomeTransactionRow {
  id: string;
  date: Date;
  amount: number;
  source: string;
  account_name: string;
  profile_name?: string;
}

interface Props {
  transactions: IncomeTransactionRow[];
  canManageIncome: boolean;
  onEditTransaction: (tx: IncomeTransactionRow) => void;
  onDeleteTransaction: (tx: IncomeTransactionRow) => void;
}

export default function IncomeTable({
  transactions,
  canManageIncome,
  onEditTransaction,
  onDeleteTransaction,
}: Props) {
  const { currency } = useSystemSettings();

  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No income transactions found for the selected filters.</p>;
  }

  const showMember = transactions.some((t) => !!t.profile_name);
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {showMember ? <TableHead>Member</TableHead> : null}
          <TableHead>Source</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {canManageIncome ? <TableHead className="text-center">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
            {showMember ? <TableCell>{tx.profile_name || "-"}</TableCell> : null}
            <TableCell>{tx.source}</TableCell>
            <TableCell>{tx.account_name}</TableCell>
            <TableCell className="text-right">
              {currency.symbol}
              {tx.amount.toFixed(2)}
            </TableCell>
            {canManageIncome ? (
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEditTransaction(tx)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteTransaction(tx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}

        <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
          <TableCell colSpan={showMember ? 4 : 3}>TOTAL</TableCell>
          <TableCell className="text-right">
            {currency.symbol}
            {totalAmount.toFixed(2)}
          </TableCell>
          {canManageIncome ? <TableCell /> : null}
        </TableRow>
      </TableBody>
    </Table>
  );
}