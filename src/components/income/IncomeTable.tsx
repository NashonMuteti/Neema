"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Edit, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  profile_id: string;
  account_name: string; // Joined from financial_accounts
}

interface MonthYearOption {
  value: string;
  label: string;
}

interface IncomeTableProps {
  transactions: IncomeTransaction[];
  canManageIncome: boolean;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string; // This is now the localSearchQuery from parent
  setSearchQuery: (query: string) => void; // This is now setLocalSearchQuery from parent
  months: MonthYearOption[];
  years: MonthYearOption[];
  onEditTransaction: (transaction: IncomeTransaction) => void; // Updated signature
  onDeleteTransaction: (transaction: IncomeTransaction) => void; // Updated signature
}

const IncomeTable: React.FC<IncomeTableProps> = ({
  transactions,
  canManageIncome,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const { currency } = useSystemSettings();

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Recent Income Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="grid gap-1.5 flex-1 min-w-[120px]">
            <Label htmlFor="income-table-filter-month">Month</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger id="income-table-filter-month">
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
            <Label htmlFor="income-table-filter-year">Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger id="income-table-filter-year">
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
              placeholder="Search source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              id="income-table-search-query"
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        {transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManageIncome && <TableHead className="text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{tx.source}</TableCell>
                  <TableCell>{tx.account_name}</TableCell>
                  <TableCell className="text-right">{currency.symbol}{tx.amount.toFixed(2)}</TableCell>
                  {canManageIncome && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => onEditTransaction(tx)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteTransaction(tx)}>
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
          <p className="text-muted-foreground">No income transactions found for the selected period or matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomeTable;