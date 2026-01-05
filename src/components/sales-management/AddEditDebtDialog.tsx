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
import { CalendarIcon, Save, PlusCircle, Trash2 } from "lucide-react"; // Added PlusCircle, Trash2
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Member, Product } from "@/types/common"; // Import Product
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components

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

interface SaleItem { // Define SaleItem interface locally for this dialog
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface AddEditDebtDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: Debt; // For editing existing debt
  onSave: (debt: Omit<Debt, 'id' | 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description' | 'created_by_profile_id'> & { id?: string; sale_items?: SaleItem[] }) => void;
  canManageDebts: boolean;
  members: Member[]; // List of members to select as debtor
  products: Product[]; // New prop: List of available products
}

const AddEditDebtDialog: React.FC<AddEditDebtDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
  canManageDebts,
  members,
  products, // Destructure new prop
}) => {
  const { currency } = useSystemSettings();

  const [description, setDescription] = React.useState(initialData?.description || "");
  const [originalAmount, setOriginalAmount] = React.useState(initialData?.original_amount.toString() || "0");
  const [dueDate, setDueDate] = React.useState<Date | undefined>(initialData?.due_date);
  const [debtorProfileId, setDebtorProfileId] = React.useState<string | undefined>(initialData?.debtor_profile_id);
  const [customerName, setCustomerName] = React.useState(initialData?.customer_name || "");
  const [notes, setNotes] = React.useState(initialData?.notes || "");
  const [isSaving, setIsSaving] = React.useState(false);

  const [isStockSale, setIsStockSale] = React.useState(false); // New state for stock sale toggle
  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);
  const [itemQuantity, setItemQuantity] = React.useState("1");
  const [saleItems, setSaleItems] = React.useState<SaleItem[]>([]); // New state for selected stock items

  React.useEffect(() => {
    if (isOpen) {
      setDescription(initialData?.description || "");
      setOriginalAmount(initialData?.original_amount.toString() || "0");
      setDueDate(initialData?.due_date);
      setDebtorProfileId(initialData?.debtor_profile_id);
      setCustomerName(initialData?.customer_name || "");
      setNotes(initialData?.notes || "");
      setIsSaving(false);

      // Reset stock sale related states
      setIsStockSale(false); // Default to false for new debts
      setSaleItems([]);
      setSelectedProductId(products.length > 0 ? products[0].id : undefined);
      setItemQuantity("1");
    }
  }, [isOpen, initialData, products]);

  // Calculate originalAmount based on saleItems if it's a stock sale
  React.useEffect(() => {
    if (isStockSale) {
      const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
      setOriginalAmount(total.toFixed(2));
    } else if (!initialData) { // Only reset if adding new debt and not a stock sale
      setOriginalAmount("0");
    }
  }, [isStockSale, saleItems, initialData]);

  const handleAddSaleItem = () => {
    if (!selectedProductId || !itemQuantity) {
      showError("Please select a product and enter a quantity.");
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    const quantity = parseFloat(itemQuantity);

    if (!product) {
      showError("Selected product not found.");
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantity must be a positive number.");
      return;
    }
    if (product.current_stock < quantity) {
      showError(`Insufficient stock for ${product.name}. Available: ${product.current_stock}`);
      return;
    }

    const existingItemIndex = saleItems.findIndex(item => item.product_id === selectedProductId);
    if (existingItemIndex > -1) {
      const updatedItems = [...saleItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;

      if (product.current_stock < newQuantity) {
        showError(`Adding ${quantity} more would exceed available stock for ${product.name}.`);
        return;
      }

      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: newQuantity * existingItem.unit_price,
      };
      setSaleItems(updatedItems);
    } else {
      setSaleItems(prev => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price,
          subtotal: quantity * product.price,
        },
      ]);
    }

    setItemQuantity("1"); // Reset quantity
  };

  const handleRemoveSaleItem = (productId: string) => {
    setSaleItems(prev => prev.filter(item => item.product_id !== productId));
  };

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
    if (isStockSale && saleItems.length === 0) {
      showError("Please add at least one stock item for a stock sale debt.");
      return;
    }

    setIsSaving(true);

    // Construct the payload for onSave, explicitly omitting 'id' and 'created_by_profile_id'
    // and then adding 'id' back as optional.
    const debtData: Omit<Debt, 'id' | 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description' | 'created_by_profile_id'> & { id?: string; sale_items?: SaleItem[] } = {
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

    if (isStockSale) {
      debtData.sale_items = saleItems; // Include sale items in payload
    }

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
          
          {!initialData && ( // Only show for new debts
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-stock-sale"
                checked={isStockSale}
                onCheckedChange={(checked) => setIsStockSale(checked as boolean)}
                disabled={!canManageDebts || isSaving}
              />
              <Label htmlFor="is-stock-sale">Is this debt for a stock sale?</Label>
            </div>
          )}

          {isStockSale ? (
            <>
              <h3 className="text-md font-semibold mt-4">Stock Items for Sale</h3>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId} disabled={!canManageDebts || products.length === 0 || isSaving}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Products</SelectLabel>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.current_stock} in stock)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-20"
                  min="1"
                  disabled={!canManageDebts || isSaving}
                />
                <Button onClick={handleAddSaleItem} size="icon" disabled={!canManageDebts || !selectedProductId || !itemQuantity || products.length === 0 || isSaving}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>

              {saleItems.length > 0 && (
                <div className="mt-4 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item, index) => (
                        <TableRow key={item.product_id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{currency.symbol}{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currency.symbol}{item.subtotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSaleItem(item.product_id)} disabled={isSaving}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">{currency.symbol}{parseFloat(originalAmount).toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="debt-original-amount">Original Amount ({currency.symbol})</Label>
              <Input
                id="debt-original-amount"
                type="number"
                step="0.01"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                disabled={!canManageDebts || isSaving || (initialData && initialData.amount_due < initialData.original_amount)}
              />
              {initialData && initialData.amount_due < initialData.original_amount && (
                <p className="text-sm text-muted-foreground">Original amount cannot be changed if payments have been made.</p>
              )}
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={!canManageDebts || isSaving || (isStockSale && saleItems.length === 0)}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Debt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditDebtDialog;