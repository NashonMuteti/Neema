"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Textarea } from "@/components/ui/textarea";

// Dummy financial accounts (should ideally come from a backend/admin setup)
const financialAccounts = [
  { id: "acc1", name: "Cash at Hand" },
  { id: "acc2", name: "Petty Cash" },
  { id: "acc3", name: "Bank Mpesa Account" },
  { id: "acc4", name: "Main Bank Account" },
];

const IncomeExpenditure = () => {
  // Income State
  const [incomeDate, setIncomeDate] = React.useState<Date | undefined>(new Date());
  const [incomeAmount, setIncomeAmount] = React.useState("");
  const [incomeAccount, setIncomeAccount] = React.useState<string | undefined>(undefined);
  const [incomeSource, setIncomeSource] = React.useState("");

  // Expenditure State
  const [expenditureDate, setExpenditureDate] = React.useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = React.useState("");
  const [expenditureAccount, setExpenditureAccount] = React.useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = React.useState("");

  const handlePostIncome = () => {
    if (!incomeDate || !incomeAmount || !incomeAccount || !incomeSource) {
      showError("All income fields are required.");
      return;
    }
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive income amount.");
      return;
    }

    console.log("Posting Income:", {
      date: incomeDate,
      amount,
      account: incomeAccount,
      source: incomeSource,
    });
    showSuccess("Income posted successfully!");
    // Reset form
    setIncomeDate(new Date());
    setIncomeAmount("");
    setIncomeAccount(undefined);
    setIncomeSource("");
  };

  const handlePostExpenditure = () => {
    if (!expenditureDate || !expenditureAmount || !expenditureAccount || !expenditurePurpose) {
      showError("All expenditure fields are required.");
      return;
    }
    const amount = parseFloat(expenditureAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive expenditure amount.");
      return;
    }

    console.log("Posting Expenditure:", {
      date: expenditureDate,
      amount,
      account: expenditureAccount,
      purpose: expenditurePurpose,
    });
    showSuccess("Expenditure posted successfully!");
    // Reset form
    setExpenditureDate(new Date());
    setExpenditureAmount("");
    setExpenditureAccount(undefined);
    setExpenditurePurpose("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Income & Expenditure</h1>
      <p className="text-lg text-muted-foreground">
        Record and manage all financial inflows and outflows.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Income Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record Other Income</CardTitle>
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
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="income-account">Received Into Account</Label>
              <Select value={incomeAccount} onValueChange={setIncomeAccount}>
                <SelectTrigger id="income-account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Financial Accounts</SelectLabel>
                    {financialAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
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
              />
            </div>

            <Button onClick={handlePostIncome} className="w-full">
              Post Income
            </Button>
          </CardContent>
        </Card>

        {/* Record Expenditure Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record Expenditure</CardTitle>
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
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-account">Debited From Account</Label>
              <Select value={expenditureAccount} onValueChange={setExpenditureAccount}>
                <SelectTrigger id="expenditure-account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Financial Accounts</SelectLabel>
                    {financialAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
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
              />
            </div>

            <Button onClick={handlePostExpenditure} className="w-full">
              Post Expenditure
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IncomeExpenditure;