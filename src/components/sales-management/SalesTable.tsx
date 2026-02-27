"use client";

import * as React from "react";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSystemSettings } from "@/context/SystemSettingsContext";

export interface SaleItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleTransactionRow {
  id: string;
  customer_name?: string;
  sale_date: Date;
  total_amount: number;
  account_name: string;
  notes?: string;
  sale_items: SaleItemRow[];
}

type Props = {
  salesTransactions: SaleTransactionRow[];
};

export default function SalesTable({ salesTransactions }: Props) {
  const { currency } = useSystemSettings();

  if (salesTransactions.length === 0) {
    return <p className="text-muted-foreground">No sales transactions found for the selected filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salesTransactions.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell>{format(sale.sale_date, "MMM dd, yyyy")}</TableCell>
            <TableCell>{sale.customer_name || "-"}</TableCell>
            <TableCell>
              {sale.sale_items.map((item, idx) => (
                <div key={idx} className="text-xs text-muted-foreground">
                  {item.quantity}× {item.product_name}
                </div>
              ))}
            </TableCell>
            <TableCell>{sale.account_name}</TableCell>
            <TableCell className="max-w-[180px] truncate">{sale.notes || "-"}</TableCell>
            <TableCell className="text-right font-medium">
              {currency.symbol}
              {sale.total_amount.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
