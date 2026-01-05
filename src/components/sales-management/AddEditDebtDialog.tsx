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
import { CalendarIcon, Save } from "lucide-react";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Member } from "@/types/common";

export interface Debt {
  id: string;
  created_by_profile_id: string;
  sale_id?: string;
  debtor_profile_id?: string;
  customer_name?: string;
  description: string;
  original_amount: number;
  amount_due: number;
  due_date?: Date;
  status: "Outstanding" | "Partially Paid" | "Paid" | "Overdue";
  notes?: string;
  created_at: Date;
  // Joined data for display
  created_by_name?: string;
  debtor_name?: string;
  sale_description?: string;
}

interface AddEditDebtDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: Debt; // For editing existing debt
  onSave: (debt: Omit<Debt, 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description' | 'created_by_profile_id'> & { id?: string }) => void;
  canManageDebts: boolean;
  members: Member[]; // List of members to select as debtor
}

const AddEditDebtDialog: React.FC<AddEditDebtDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
  canManageDebts,
  members,
}) => {
  const { currency } = useSystemSettings();

  const [description, setDescription] = React.useState(initialData?.description || "");
  const [originalAmount, setOriginalAmount] = React.useState(initialData?.original_amount.toString() || "0");
  const [dueDate, setDueDate] = React.useState<Date | undefined>(initialData?.due_date);
  const [debtorProfileId, setDebtorProfileId] = React.useState<string | undefined>(initialData?.debtor_profile_id);
  const [customerName, setCustomerName] = React.useState(initialData?.customer_name || "");
  const [notes, setNotes] = React.useState(initialData?.notes || "");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDescription(initialData?.description || "");
      setOriginalAmount(initialData?.original_amount.toString() || "0");
      setDueDate(initialData?.due_date);
      setDebtorProfileId(initialData?.debtor_profile_id);
      setCustomerName(initialData?.customer_name || "");
      setNotes(initialData?.notes || "");
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!description.trim()) {
      showError("Debt description is required.");
      return;
    }
    const parsedOriginalAmount = parseFloat(originalAmount);
    if (isNaN(parsedOriginalAmount) || parsedOriginalAmount <= 0) {
      showError("Original amount must be a positive number.");
      return;
    }
    if (!debtorProfileId && !customerName.trim()) {
      showError("Either a member or a customer name must be provided for the debtor.");
      return;
    }
    if (debtorProfileId && customerName.trim()) {
      showError("Please specify either a member or a customer name, not both.");
      return;
    }

    setIsSaving(true);

    const debtData: Omit<Debt, 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description' | 'created_by_profile_id'> & { id?: string } = {
      description: description.trim(),
      original_amount: parsedOriginalAmount,
      amount_due: initialData?.amount_due ?? parsedOriginalAmount, // Keep existing amount_due or set to original for new debt
      due_date: dueDate,
      debtor_profile_id: debtorProfileId || undefined,
      customer_name: customerName.trim() || undefined,
      notes: notes.trim() || undefined,
      status: initialData?.status || (parsedOriginalAmount === (initialData?.amount_due ?? parsedOriginalAmount) ? "Outstanding" : "Partially Paid"), // Default status
      sale_id: initialData?.sale_id || undefined,
    };

    if (initialData?.id) {
      debtData.id = initialData.id;
    }

    onSave(debtData);
    setIsOpen(false);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Debt" : "Add New Debt"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to the debt record.` : "Enter the details for a new debt."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="debt-description">Description</Label>
            <Textarea
              id="debt-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Unpaid balance for Project X, Loan to John Doe"
              disabled={!canManageDebts || isSaving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="debt-original-amount">Original Amount ({currency.symbol})</Label>
            <Input
              id="debt-original-amount"
              type="number"
              step="0.01"
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              disabled={!canManageDebts || isSaving || (initialData && initialData.amount_due < initialData.original_amount)} // Disable if partially paid
            />
            {initialData && initialData.amount_due < initialData.original_amount && (
              <p className="text-sm text-muted-foreground">Original amount cannot be changed if payments have been made.</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="debt-due-date">Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  id="debt-due-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={!canManageDebts || isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="debtor-member">Debtor (Member - Optional)</Label>
            <Select value={debtorProfileId} onValueChange={setDebtorProfileId} disabled={!canManageDebts || isSaving || members.length === 0}>
              <SelectTrigger id="debtor-member">
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
            <Label htmlFor="customer-name">Debtor (Customer Name - Optional)</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., External Client"
              disabled={!canManageDebts || isSaving}
            />
            <p className="text-sm text-muted-foreground">Use this for non-member debtors. Leave blank if selecting a member.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="debt-notes">Notes (Optional)</Label>
            <Textarea
              id="debt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this debt"
              disabled={!canManageDebts || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageDebts || isSaving}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Debt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditDebtDialog;