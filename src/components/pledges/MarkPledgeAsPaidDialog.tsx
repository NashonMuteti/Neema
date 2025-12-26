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
import { CheckCircle, DollarSign } from "lucide-react";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Label } from "@/components/ui/label"; // Added this import

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid";
  member_name: string;
  project_name: string;
  comments?: string;
}

interface MarkPledgeAsPaidDialogProps {
  pledge: Pledge;
  onConfirmPayment: (pledgeId: string, receivedIntoAccountId: string, paymentMethod: string) => void;
  financialAccounts: FinancialAccount[];
  canManagePledges: boolean;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "online-payment", label: "Online Payment" },
  { value: "mobile-money", label: "Mobile Money" },
];

const MarkPledgeAsPaidDialog: React.FC<MarkPledgeAsPaidDialogProps> = ({
  pledge,
  onConfirmPayment,
  financialAccounts,
  canManagePledges,
}) => {
  const { currency } = useSystemSettings();
  const [isOpen, setIsOpen] = React.useState(false);
  const [receivedIntoAccount, setReceivedIntoAccount] = React.useState<string | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Reset states when dialog opens
      setReceivedIntoAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setSelectedPaymentMethod(paymentMethods.length > 0 ? paymentMethods[0].value : undefined);
      setIsProcessing(false);
    }
  }, [isOpen, financialAccounts]);

  const handleConfirm = async () => {
    if (!receivedIntoAccount || !selectedPaymentMethod) {
      showError("Please select both the account and payment method.");
      return;
    }
    setIsProcessing(true);
    await onConfirmPayment(pledge.id, receivedIntoAccount, selectedPaymentMethod);
    setIsProcessing(false);
    setIsOpen(false); // Close dialog after processing
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Mark as Paid"
          disabled={!canManagePledges || pledge.status === "Paid"}
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark Pledge as Paid</DialogTitle>
          <DialogDescription>
            Confirm payment for {pledge.member_name}'s pledge of {currency.symbol}{pledge.amount.toFixed(2)} for project {pledge.project_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="received-into-account">Received Into Account</Label>
            <Select
              value={receivedIntoAccount}
              onValueChange={setReceivedIntoAccount}
              disabled={!canManagePledges || financialAccounts.length === 0 || isProcessing}
            >
              <SelectTrigger id="received-into-account">
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

          <div className="grid gap-1.5">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
              disabled={!canManagePledges || isProcessing}
            >
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Methods</SelectLabel>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleConfirm}
            disabled={!canManagePledges || !receivedIntoAccount || !selectedPaymentMethod || isProcessing}
          >
            {isProcessing ? "Processing..." : <><DollarSign className="mr-2 h-4 w-4" /> Confirm Payment</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkPledgeAsPaidDialog;