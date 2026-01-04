"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
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

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleTransaction {
  id: string;
  customer_name?: string;
  sale_date: Date;
  total_amount: number;
  payment_method: string;
  received_into_account_id: string;
  account_name: string;
  notes?: string;
  profile_id: string;
  sale_items: SaleItem[];
}

interface SalesTableProps {
  salesTransactions: SaleTransaction[];
  canManageDailySales: boolean;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
}

const SalesTable: React.FC<SalesTableProps> = ({
  salesTransactions,
  canManageDailySales,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
}) => {
  const { currency } = useSystemSettings();

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Recent Sales Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="grid gap-1.5 flex-1 min-w-[120px]">
            <Label htmlFor="sales-filter-month">Month</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger id="sales-filter-month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 flex-1 min-w-[100px]">
            <Label htmlFor="sales-filter-year">Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger id="sales-filter-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex items-center flex-1 min-w-[180px]">
            <Input
              type="text"
              placeholder="Search customer/notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              id="sales-search-query"
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {salesTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {/* Actions column removed for simplicity in this refactor, can be added back if needed */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesTransactions.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(sale.sale_date, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{sale.customer_name || "-"}</TableCell>
                  <TableCell>
                    {sale.sale_items.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                  </TableCell>
                  <TableCell className="capitalize">{sale.payment_method.replace(/-/g, " ")}</TableCell>
                  <TableCell>{sale.account_name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{sale.total_amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">No sales transactions found for the selected period or matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesTable;