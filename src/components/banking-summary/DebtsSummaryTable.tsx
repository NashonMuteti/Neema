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
import { format } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Debt } from "@/components/sales-management/AddEditDebtDialog"; // Import Debt interface

interface DebtsSummaryTableProps {
  filteredDebts: Debt[];
  totalOutstandingDebts: number;
  getPeriodLabel: () => string;
}

const DebtsSummaryTable: React.FC<DebtsSummaryTableProps> = ({
  filteredDebts,
  totalOutstandingDebts,
  getPeriodLabel,
}) => {
  const { currency } = useSystemSettings();

  return (
    <>
      <h3 className="text-xl font-semibold mb-2 mt-6">Debts Overview for {getPeriodLabel()}</h3>
      {filteredDebts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debtor</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDebts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium">{debt.debtor_name}</TableCell>
                <TableCell>{debt.description}</TableCell>
                <TableCell>{debt.due_date ? format(debt.due_date, "MMM dd, yyyy") : "N/A"}</TableCell>
                <TableCell className="text-right">{currency.symbol}{debt.amount_due.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`font-medium ${debt.status === "Paid" ? "text-green-600" : debt.status === "Overdue" ? "text-destructive" : "text-yellow-600"}`}>
                    {debt.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
              <TableCell colSpan={3}>Total Outstanding Debts</TableCell>
              <TableCell className="text-right">{currency.symbol}{totalOutstandingDebts.toFixed(2)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center mt-4">No debts found for the selected period.</p>
      )}
    </>
  );
};

export default DebtsSummaryTable;