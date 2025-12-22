"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface PettyCashFormProps {
  financialAccounts: FinancialAccount[];
  expenseDate: Date | undefined;
  setExpenseDate: (date: Date | undefined) => void;
  expenseAmount: string;
  setExpenseAmount: (amount: string) => void;
  expenseAccount: string | undefined;
  setExpenseAccount: (accountId: string | undefined) => void;
  expensePurpose: string;
  setExpensePurpose: (purpose: string) => void;
  handlePostExpense: () => Promise<void>;
  canManagePettyCash: boolean;
}

const PettyCashForm: React.FC<PettyCashFormProps> = ({
  financialAccounts,
  expenseDate,
  setExpenseDate,
  expenseAmount,
  setExpenseAmount,
  expenseAccount,
  setExpenseAccount,
  expensePurpose,
  setExpensePurpose,
  handlePostExpense,
  canManagePettyCash,
}) => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Record New Petty Cash Expense</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="expense-date">Date of Expense</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expenseDate && "text-muted-foreground"
                )}
                disabled={!canManagePettyCash}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expenseDate}
                onSelect={setExpenseDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            disabled={!canManagePettyCash}
          />
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="expense-account">Debited From Account</Label>
          <Select value={expenseAccount} onValueChange={setExpenseAccount} disabled={!canManagePettyCash}>
            <SelectTrigger id="expense-account">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Financial Accounts</SelectLabel>
                {financialAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (Balance: ${account.current_balance.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="expense-purpose">Purpose/Description</Label>
          <Textarea
            id="expense-purpose"
            placeholder="e.g., Office supplies, Snacks, Transportation"
            value={expensePurpose}
            onChange={(e) => setExpensePurpose(e.target.value)}
            disabled={!canManagePettyCash}
          />
        </div>
        
        <Button onClick={handlePostExpense} className="w-full" disabled={!canManagePettyCash || !expenseDate || !expenseAmount || !expenseAccount || !expensePurpose}>
          Post Expense
        </Button>
      </CardContent>
    </Card>
  );
};

export default PettyCashForm;