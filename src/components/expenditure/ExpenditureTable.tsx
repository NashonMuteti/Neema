"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { format } from "date-fns";
import { Edit, Trash2, Search } from "lucide-react";

interface ExpenditureTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  purpose: string;
  user_id: string;
  account_name: string;
}

interface ExpenditureTableProps {
  transactions: ExpenditureTransaction[];
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  handleEditTransaction: (id: string) => void;
  handleDeleteTransaction: (id: string, amount: number, accountId: string) => Promise<void>;
  canManageExpenditure: boolean;
}

const ExpenditureTable: React.FC<ExpenditureTableProps> = ({
  transactions,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
  handleEditTransaction,
  handleDeleteTransaction,
  canManageExpenditure,
}) => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Recent Expenditure Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="grid gap-1.5 flex-1 min-w-[120px]">
            <Label htmlFor="filter-month">Month</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger id="filter-month">
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
            <Label htmlFor="filter-year">Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger id="filter-year">
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
              placeholder="Search purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        {transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManageExpenditure && <TableHead className="text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{tx.purpose}</TableCell>
                  <TableCell>{(tx as any).account_name}</TableCell>
                  <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                  {canManageExpenditure && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id, tx.amount, tx.account_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">No expenditure transactions found for the selected period or matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenditureTable;