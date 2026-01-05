"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, DollarSign } from "lucide-react";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { FinancialAccount } from "@/types/common";
import { Debt } from "./AddEditDebtDialog"; // Import Debt interface

interface RecordDebtPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  debt: Debt;
  onRecordPayment: (paymentData: {
    debtId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    receivedIntoAccountId: string;
    notes?: string;
  }) => Promise<void>;
  canManageDebts: boolean;
  financialAccounts: FinancialAccount[];
  isProcessing: boolean;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "online-payment", label: "Online Payment" },
  { value: "mobile-money", label: "Mobile Money" },
];

const RecordDebtPaymentDialog: React.FC<RecordDebtPaymentDialogProps> = ({
  isOpen,
  setIsOpen,
  debt,
  onRecordPayment,
  canManageDebts,
  financialAccounts,
  isProcessing,
}) => {
  const { currency } = useSystemSettings();

  const [paymentAmount, setPaymentAmount] = React.useState(debt.amount_due.toFixed(2));
  const [paymentDate, setPaymentDate] = React.useState<Date | undefined>(new Date());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string | undefined>(paymentMethods[0]?.value);
  const [receivedIntoAccountId, setReceivedIntoAccountId] = React.useState<string | undefined>(financialAccounts[0]?.id);
  const [notes, setNotes] = React.useState("");

  const receivableAccounts = React.useMemo(() => {
    return financialAccounts.filter(account => account.can_receive_payments);
  }, [financialAccounts]);

  React.useEffect(() => {
    if (isOpen) {
      setPaymentAmount(debt.amount_due.toFixed(2));
      setPaymentDate(new Date());
      setSelectedPaymentMethod(paymentMethods[0]?.value);
      setReceivedIntoAccountId(receivableAccounts.length > 0 ? receivableAccounts[0].id : undefined); // Set default to a receivable account
      setNotes("");
    }
  }, [isOpen, debt, receivableAccounts]);

  const handleSubmit = async () => {
    if (!paymentAmount || !paymentDate || !selectedPaymentMethod || !receivedIntoAccountId) {
      showError("All payment fields are required.");
      return;
    }
    const parsedPaymentAmount = parseFloat(paymentAmount);
    if (isNaN(parsedPaymentAmount) || parsedPaymentAmount <= 0) {
      showError("Payment amount must be a positive number.");
      return;
    }
    if (parsedPaymentAmount > debt.amount_due) {
      showError(`Payment amount cannot exceed the remaining amount due (${currency.symbol}${debt.amount_due.toFixed(2)}).`);
      return;
    }

    await onRecordPayment({
      debtId: debt.id,
      amount: parsedPaymentAmount,
      paymentDate,
      paymentMethod: selectedPaymentMethod,
      receivedIntoAccountId,
      notes: notes.trim() || undefined,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment for Debt</DialogTitle>
          <DialogDescription>
            Record a payment for the debt: "{debt.description}".
            <br />
            Remaining Due: <span className="font-semibold">{currency.symbol}{debt.amount_due.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="payment-amount">Amount Paid ({currency.symbol})</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              disabled={!canManageDebts || isProcessing}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  id="payment-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                  disabled={!canManageDebts || isProcessing}
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
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} disabled={!canManageDebts || isProcessing}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Payment Methods</SelectLabel>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="received-into-account">Received Into Account</Label>
            <Select value={receivedIntoAccountId} onValueChange={setReceivedIntoAccountId} disabled={!canManageDebts || receivableAccounts.length === 0 || isProcessing}>
              <SelectTrigger id="received-into-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Financial Accounts</SelectLabel>
                  {receivableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {receivableAccounts.length === 0 && <p className="text-sm text-destructive">No financial accounts found that can receive payments. Please enable one in Admin Settings.</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="payment-notes">Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for this payment"
              disabled={!canManageDebts || isProcessing}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageDebts || isProcessing || receivableAccounts.length === 0}>
            <DollarSign className="mr-2 h-4 w-4" /> {isProcessing ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordDebtPaymentDialog;