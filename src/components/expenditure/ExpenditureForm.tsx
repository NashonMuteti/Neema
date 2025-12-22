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

interface ExpenditureFormProps {
  financialAccounts: FinancialAccount[];
  expenditureDate: Date | undefined;
  setExpenditureDate: (date: Date | undefined) => void;
  expenditureAmount: string;
  setExpenditureAmount: (amount: string) => void;
  expenditureAccount: string | undefined;
  setExpenditureAccount: (accountId: string | undefined) => void;
  expenditurePurpose: string;
  setExpenditurePurpose: (purpose: string) => void;
  handlePostExpenditure: () => Promise<void>;
  canManageExpenditure: boolean;
}

const ExpenditureForm: React.FC<ExpenditureFormProps> = ({
  financialAccounts,
  expenditureDate,
  setExpenditureDate,
  expenditureAmount,
  setExpenditureAmount,
  expenditureAccount,
  setExpenditureAccount,
  expenditurePurpose,
  setExpenditurePurpose,
  handlePostExpenditure,
  canManageExpenditure,
}) => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Record New Expenditure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="expenditure-date">Date of Expenditure</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expenditureDate && "text-muted-foreground"
                )}
                disabled={!canManageExpenditure}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expenditureDate ? format(expenditureDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expenditureDate}
                onSelect={setExpenditureDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="expenditure-amount">Amount</Label>
          <Input
            id="expenditure-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={expenditureAmount}
            onChange={(e) => setExpenditureAmount(e.target.value)}
            disabled={!canManageExpenditure}
          />
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="expenditure-account">Debited From Account</Label>
          <Select value={expenditureAccount} onValueChange={setExpenditureAccount} disabled={!canManageExpenditure}>
            <SelectTrigger id="expenditure-account">
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
          <Label htmlFor="expenditure-purpose">Purpose/Description</Label>
          <Textarea
            id="expenditure-purpose"
            placeholder="e.g., Equipment rental, Travel expenses, Office supplies"
            value={expenditurePurpose}
            onChange={(e) => setExpenditurePurpose(e.target.value)}
            disabled={!canManageExpenditure}
          />
        </div>
        
        <Button onClick={handlePostExpenditure} className="w-full" disabled={!canManageExpenditure || !expenditureDate || !expenditureAmount || !expenditureAccount || !expenditurePurpose}>
          Post Expenditure
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExpenditureForm;