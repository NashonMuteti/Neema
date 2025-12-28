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
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { FinancialAccount, Member, MonthYearOption } from "@/types/common";

interface IncomeFormProps {
  financialAccounts: FinancialAccount[];
  members: Member[];
  canManageIncome: boolean;
  onPostIncome: (data: {
    incomeDate: Date;
    incomeAmount: number;
    incomeAccount: string;
    incomeSource: string;
    selectedIncomeMemberId?: string;
  }) => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({
  financialAccounts,
  members,
  canManageIncome,
  onPostIncome,
}) => {
  const { currency } = useSystemSettings();

  const [incomeDate, setIncomeDate] = React.useState<Date | undefined>(new Date());
  const [incomeAmount, setIncomeAmount] = React.useState("");
  const [incomeAccount, setIncomeAccount] = React.useState<string | undefined>(
    financialAccounts.length > 0 ? financialAccounts[0].id : undefined
  );
  const [incomeSource, setIncomeSource] = React.useState("");
  const [selectedIncomeMemberId, setSelectedIncomeMemberId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (financialAccounts.length > 0 && !incomeAccount) {
      setIncomeAccount(financialAccounts[0].id);
    }
  }, [financialAccounts, incomeAccount]);

  const handleSubmit = () => {
    if (!incomeDate || !incomeAmount || !incomeAccount || !incomeSource) {
      // Error handling will be done in the parent component (Income.tsx)
      return;
    }
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      // Error handling will be done in the parent component (Income.tsx)
      return;
    }

    onPostIncome({
      incomeDate,
      incomeAmount: amount,
      incomeAccount,
      incomeSource,
      selectedIncomeMemberId,
    });

    // Reset form
    setIncomeDate(new Date());
    setIncomeAmount("");
    setIncomeSource("");
    setSelectedIncomeMemberId(undefined);
    // Keep incomeAccount as is, or reset to default if preferred
    setIncomeAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Record New Income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="income-form-date">Date Received</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                id="income-form-date"
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
          <Label htmlFor="income-form-amount">Amount</Label>
          <Input
            id="income-form-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            disabled={!canManageIncome}
          />
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="income-form-account">Received Into Account</Label>
          <Select value={incomeAccount} onValueChange={setIncomeAccount} disabled={!canManageIncome || financialAccounts.length === 0}>
            <SelectTrigger id="income-form-account">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Financial Accounts</SelectLabel>
                {financialAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {financialAccounts.length === 0 && <p className="text-sm text-destructive">No financial accounts found. Please add one in Admin Settings.</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="income-form-member">Received From Member (Optional)</Label>
          <Select value={selectedIncomeMemberId} onValueChange={setSelectedIncomeMemberId} disabled={!canManageIncome || members.length === 0}>
            <SelectTrigger id="income-form-member">
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Members</SelectLabel>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {members.length === 0 && <p className="text-sm text-muted-foreground">No members available.</p>}
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="income-form-source">Source/Description</Label>
          <Textarea
            id="income-form-source"
            placeholder="e.g., Grant from Film Fund, Donation from Sponsor"
            value={incomeSource}
            onChange={(e) => setIncomeSource(e.target.value)}
            disabled={!canManageIncome}
          />
        </div>
        
        <Button onClick={handleSubmit} className="w-full" disabled={!canManageIncome || !incomeDate || !incomeAmount || !incomeAccount || !incomeSource || financialAccounts.length === 0}>
          Post Income
        </Button>
      </CardContent>
    </Card>
  );
};

export default IncomeForm;