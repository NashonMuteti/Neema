"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { CheckCircle, DollarSign, CalendarIcon } from "lucide-react"; // Added CalendarIcon
import { showError, showSuccess } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input"; // Added Input
import { Calendar } from "@/components/ui/calendar"; // Added Calendar
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover
import { cn } from "@/lib/utils"; // Added cn
import { format } from "date-fns"; // Added format

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid";
  member_name: string;
  project_name: string;
  comments?: string;
}

interface MarkPledgeAsPaidDialogProps {
  pledge: Pledge;
  onConfirmPayment: (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => Promise<void>; // Updated signature
  financialAccounts: FinancialAccount[];
  canManagePledges: boolean;
  isProcessing: boolean; // New prop
}

const MarkPledgeAsPaidDialog: React.FC<MarkPledgeAsPaidDialogProps> = ({
  pledge,
  onConfirmPayment,
  financialAccounts,
  canManagePledges,
  isProcessing, // Destructure new prop
}) => {
  const { currency } = useSystemSettings();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [receivedIntoAccount, setReceivedIntoAccount] = React.useState<string | undefined>(undefined);
  const [amountPaid, setAmountPaid] = React.useState<string>("");
  const [paymentDate, setPaymentDate] = React.useState<Date | undefined>(new Date());
  // Removed local isProcessing state, now using prop

  const remainingAmount = pledge.original_amount - pledge.paid_amount;

  React.useEffect(() => {
    if (isOpen) {
      // Reset states when dialog opens
      setReceivedIntoAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setAmountPaid(remainingAmount.toFixed(2)); // Default to remaining amount
      setPaymentDate(new Date());
    }
  }, [isOpen, financialAccounts, remainingAmount]);

  const handleConfirm = async () => {
    if (!receivedIntoAccount || !amountPaid || !paymentDate) {
      showError("Please fill in all required fields.");
      return;
    }
    if (!currentUser) {
      showError("User not logged in to perform this action.");
      return;
    }

    const parsedAmountPaid = parseFloat(amountPaid);
    if (isNaN(parsedAmountPaid) || parsedAmountPaid <= 0) {
      showError("Please enter a valid positive amount paid.");
      return;
    }
    if (parsedAmountPaid > remainingAmount) {
      showError(`Amount paid cannot exceed the remaining pledge amount of ${currency.symbol}${remainingAmount.toFixed(2)}.`);
      return;
    }

    await onConfirmPayment(pledge.id, parsedAmountPaid, receivedIntoAccount, paymentDate);
    setIsOpen(false); // Close dialog after processing
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Mark as Paid"
          disabled={!canManagePledges || pledge.status === "Paid" || isProcessing} // Use isProcessing prop
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Pledge Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {pledge.member_name}'s pledge of {currency.symbol}{pledge.original_amount.toFixed(2)} for project {pledge.project_name}.
            <br />
            Remaining: <span className="font-semibold">{currency.symbol}{remainingAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="mark-paid-dialog-payment-date">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  id="mark-paid-dialog-payment-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                  disabled={!canManagePledges || isProcessing}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mark-paid-dialog-amount-paid">Amount Paid</Label>
            <Input
              id="mark-paid-dialog-amount-paid"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              disabled={!canManagePledges || isProcessing}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mark-paid-dialog-received-into-account">Received Into Account</Label>
            <Select
              value={receivedIntoAccount}
              onValueChange={setReceivedIntoAccount}
              disabled={!canManagePledges || financialAccounts.length === 0 || isProcessing}
            >
              <SelectTrigger id="mark-paid-dialog-received-into-account">
                <SelectValue placeholder="Select account" />
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
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleConfirm}
            disabled={!canManagePledges || !receivedIntoAccount || !amountPaid || !paymentDate || isProcessing || financialAccounts.length === 0}
          >
            {isProcessing ? "Processing..." : <><DollarSign className="mr-2 h-4 w-4" /> Record Payment</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkPledgeAsPaidDialog;