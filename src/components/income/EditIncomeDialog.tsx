"use client";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FinancialAccount, Member } from "@/types/common"; // Re-using types
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  profile_id: string;
  account_name: string;
}

interface EditIncomeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData: IncomeTransaction;
  onSave: (updatedTx: IncomeTransaction) => void;
  financialAccounts: FinancialAccount[];
  members: Member[];
  canManageIncome: boolean;
  currency: { code: string; symbol: string };
}

const EditIncomeDialog: React.FC<EditIncomeDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
  financialAccounts,
  members,
  canManageIncome,
  currency,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(initialData.date);
  const [amount, setAmount] = React.useState(initialData.amount.toString());
  const [accountId, setAccountId] = React.useState<string | undefined>(initialData.account_id);
  const [source, setSource] = React.useState(initialData.source);
  const [profileId, setProfileId] = React.useState<string | undefined>(initialData.profile_id); // For associating with a member
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDate(initialData.date);
      setAmount(initialData.amount.toString());
      setAccountId(initialData.account_id);
      setSource(initialData.source);
      setProfileId(initialData.profile_id);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!date || !amount || !accountId || !source) {
      // Validation will be handled by the parent component's onSave
      return;
    }

    setIsSaving(true);
    const updatedTx: IncomeTransaction = {
      ...initialData,
      date,
      amount: parseFloat(amount),
      account_id: accountId,
      source,
      profile_id: profileId || initialData.profile_id, // Ensure profile_id is not lost
    };
    
    await onSave(updatedTx);
    setIsSaving(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Income Transaction</DialogTitle>
          <DialogDescription>
            Make changes to the income transaction details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-income-dialog-date">Date Received</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  id="edit-income-dialog-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={!canManageIncome || isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-1.5">
            <Label htmlFor="edit-income-dialog-amount">Amount</Label>
            <Input
              id="edit-income-dialog-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canManageIncome || isSaving}
            />
          </div>
          
          <div className="grid gap-1.5">
            <Label htmlFor="edit-income-dialog-account">Received Into Account</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={!canManageIncome || financialAccounts.length === 0 || isSaving}>
              <SelectTrigger id="edit-income-dialog-account">
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
            {financialAccounts.length === 0 && <p className="text-sm text-destructive">No financial accounts found.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-income-dialog-member">Received From Member (Optional)</Label>
            <Select value={profileId} onValueChange={setProfileId} disabled={!canManageIncome || members.length === 0 || isSaving}>
              <SelectTrigger id="edit-income-dialog-member">
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
            <Label htmlFor="edit-income-dialog-source">Source/Description</Label>
            <Textarea
              id="edit-income-dialog-source"
              placeholder="e.g., Grant from Film Fund, Donation from Sponsor"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={!canManageIncome || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageIncome || isSaving}>
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditIncomeDialog;