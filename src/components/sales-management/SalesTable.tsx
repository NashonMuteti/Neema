"use client";

import * as React from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  canManageDailySales?: boolean;
  isProcessing?: boolean;
  onEditSale?: (sale: SaleTransactionRow) => void;
  onDeleteSale?: (sale: SaleTransactionRow) => void;
};

export default function SalesTable({
  salesTransactions,
  canManageDailySales = false,
  isProcessing = false,
  onEditSale,
  onDeleteSale,
}: Props) {
  const { currency } = useSystemSettings();

  if (salesTransactions.length === 0) {
    return <p className="text-muted-foreground">No sales transactions found for the selected filters.</p>;
  }

  const total = salesTransactions.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const showActions = canManageDailySales && !!onEditSale && !!onDeleteSale;

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
          {showActions ? <TableHead className="text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {salesTransactions.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell>{format(sale.sale_date, "MMM dd, yyyy")}</TableCell>
            <TableCell>{sale.customer_name || "-"}</TableCell>
            <TableCell>
              {sale.sale_items.map((item, idx) => (
                <div key={`${sale.id}-${item.product_id}-${idx}`} className="text-xs text-muted-foreground">
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
            {showActions ? (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditSale?.(sale)} disabled={isProcessing}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDeleteSale?.(sale)} disabled={isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}

        <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
          <TableCell colSpan={showActions ? 6 : 5}>TOTAL</TableCell>
          <TableCell className="text-right">
            {currency.symbol}
            {total.toFixed(2)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
