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
  getContributionStatus,
  MonthYearOption,
} from "./types";

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
  filterMonth,
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
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>My Detailed Transactions for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="grid gap-1.5">
              <Label htmlFor="filter-month-all">Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger id="filter-month-all" className="w-[140px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Month</SelectLabel>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-year-all">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger id="filter-year-all" className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Year</SelectLabel>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

        {myTransactions.length > 0 ? (
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
              {myTransactions.map((transaction) => {
                const status = getContributionStatus(transaction.type, transaction.status);
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.accountOrProjectName}</TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'income' || (transaction.type === 'pledge' && transaction.status === 'Paid') ? '+' : '-'}{currency.symbol}{transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {transaction.dueDate ? format(transaction.dueDate, "MMM dd, yyyy") : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center mt-4">No transactions found for the selected period or matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsDetailedTab;