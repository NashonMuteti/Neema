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

interface IncomeFormProps {
  financialAccounts: FinancialAccount[];
  incomeDate: Date | undefined;
  setIncomeDate: (date: Date | undefined) => void;
  incomeAmount: string;
  setIncomeAmount: (amount: string) => void;
  incomeAccount: string | undefined;
  setIncomeAccount: (accountId: string | undefined) => void;
  incomeSource: string;
  setIncomeSource: (source: string) => void;
  handlePostIncome: () => Promise<void>;
  canManageIncome: boolean;
}

const IncomeForm: React.FC<IncomeFormProps> = ({
  financialAccounts,
  incomeDate,
  setIncomeDate,
  incomeAmount,
  setIncomeAmount,
  incomeAccount,
  setIncomeAccount,
  incomeSource,
  setIncomeSource,
  handlePostIncome,
  canManageIncome,
}) => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Record New Income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="income-date">Date Received</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !incomeDate && "text-muted-foreground"
                )}
                disabled={!canManageIncome}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {incomeDate ? format(incomeDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={incomeDate}
                onSelect={setIncomeDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="income-amount">Amount</Label>
          <Input
            id="income-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            disabled={!canManageIncome}
          />
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="income-account">Received Into Account</Label>
          <Select value={incomeAccount} onValueChange={setIncomeAccount} disabled={!canManageIncome}>
            <SelectTrigger id="income-account">
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
          <Label htmlFor="income-source">Source/Description</Label>
          <Textarea
            id="income-source"
            placeholder="e.g., Grant from Film Fund, Donation from Sponsor"
            value={incomeSource}
            onChange={(e) => setIncomeSource(e.target.value)}
            disabled={!canManageIncome}
          />
        </div>
        
        <Button onClick={handlePostIncome} className="w-full" disabled={!canManageIncome || !incomeDate || !incomeAmount || !incomeAccount || !incomeSource}>
          Post Income
        </Button>
      </CardContent>
    </Card>
  );
};

export default IncomeForm;