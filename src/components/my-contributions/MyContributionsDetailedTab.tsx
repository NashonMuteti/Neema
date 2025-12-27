"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Transaction,
  MonthYearOption,
} from "./types";
import { getContributionStatus } from "@/utils/contributionUtils"; // Updated import

interface MyContributionsDetailedTabProps {
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  months: MonthYearOption[];
  years: MonthYearOption[];
  myTransactions: Transaction[];
  currency: { code: string; symbol: string };
}

const MyContributionsDetailedTab: React.FC<MyContributionsDetailedTabProps> = ({
  filterMonth, // Still passed for consistency, but not used for data filtering in this component
  setFilterMonth,
  filterYear,
  setFilterYear,
  searchQuery,
  setSearchQuery,
  months,
  years,
  myTransactions,
  currency,
}) => {
  // Filter transactions to only show 'income' and 'pledge' types
  const filteredTransactions = React.useMemo(() => {
    return myTransactions.filter(t => t.type === 'income' || t.type === 'pledge');
  }, [myTransactions]);

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>My Detailed Contributions & Pledges for {filterYear}</CardTitle> {/* Updated title */}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          {/* Removed month and year selectors as data is now yearly */}
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account/Project</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const status = getContributionStatus(transaction.type, transaction.status);
                const isIncomeOrPaidPledge = transaction.type === 'income' || (transaction.type === 'pledge' && transaction.status === 'Paid');
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.accountOrProjectName}</TableCell>
                    <TableCell className="text-right">
                      {isIncomeOrPaidPledge ? '+' : '-'}{currency.symbol}{transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'pledge' && transaction.dueDate ? format(transaction.dueDate, "MMM dd, yyyy") : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center mt-4">No contributions or pledges found for the selected year or matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsDetailedTab;