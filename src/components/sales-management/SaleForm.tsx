"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { FinancialAccount } from "@/types/common";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number;
}

export interface SaleFormItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleFormPayment {
  account_id: string;
  amount: number;
  account_name?: string;
}

export interface SaleFormPayload {
  customer_name?: string;
  sale_date: string;
  payment_method: string;
  received_into_account_id: string | null;
  notes?: string;
  sale_items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  payments: Array<{ account_id: string; amount: number }>;
}

export interface EditableSale {
  id: string;
  customer_name?: string;
  sale_date: Date;
  notes?: string;
  sale_items: SaleFormItem[];
  payments: SaleFormPayment[];
}

type SplitPayment = {
  account_id: string;
  amount: string;
};

interface SaleFormProps {
  products: Product[];
  financialAccounts: FinancialAccount[];
  canManageDailySales: boolean;
  isProcessing: boolean;
  editingSale?: EditableSale | null;
  onCancelEdit?: () => void;
  onRecordSale: (payload: SaleFormPayload) => Promise<void>;
}

const SaleForm: React.FC<SaleFormProps> = ({
  products,
  financialAccounts,
  canManageDailySales,
  isProcessing,
  editingSale,
  onCancelEdit,
  onRecordSale,
}) => {
  const { currency } = useSystemSettings();

  const receivableAccounts = useMemo(() => {
    return financialAccounts.filter((account) => account.can_receive_payments);
  }, [financialAccounts]);

  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  const [customerName, setCustomerName] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [currentSaleItems, setCurrentSaleItems] = useState<SaleFormItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [itemQuantity, setItemQuantity] = useState("1");
  const [payments, setPayments] = useState<SplitPayment[]>([]);

  const originalQuantities = useMemo(() => {
    const quantities = new Map<string, number>();
    editingSale?.sale_items.forEach((item) => {
      quantities.set(item.product_id, item.quantity);
    });
    return quantities;
  }, [editingSale]);

  const resetForm = useCallback(() => {
    setSaleDate(new Date());
    setCustomerName("");
    setSaleNotes("");
    setCurrentSaleItems([]);
    setSelectedProductId(products[0]?.id);
    setItemQuantity("1");
    setPayments(receivableAccounts[0] ? [{ account_id: receivableAccounts[0].id, amount: "" }] : []);
  }, [products, receivableAccounts]);

  useEffect(() => {
    if (editingSale) {
      setSaleDate(editingSale.sale_date);
      setCustomerName(editingSale.customer_name || "");
      setSaleNotes(editingSale.notes || "");
      setCurrentSaleItems(editingSale.sale_items);
      setSelectedProductId(editingSale.sale_items[0]?.product_id || products[0]?.id);
      setItemQuantity("1");
      setPayments(
        editingSale.payments.length > 0
          ? editingSale.payments.map((payment) => ({
              account_id: payment.account_id,
              amount: String(payment.amount),
            }))
          : receivableAccounts[0]
            ? [{ account_id: receivableAccounts[0].id, amount: "" }]
            : [],
      );
      return;
    }

    resetForm();
  }, [editingSale, products, receivableAccounts, resetForm]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (payments.length === 0 && receivableAccounts.length > 0 && !editingSale) {
      setPayments([{ account_id: receivableAccounts[0].id, amount: "" }]);
    }
    if (receivableAccounts.length === 0) {
      setPayments([]);
    }
  }, [editingSale, payments.length, receivableAccounts]);

  const getAvailableStock = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return 0;
    return product.current_stock + (originalQuantities.get(productId) || 0);
  };

  const handleAddSaleItem = () => {
    if (!selectedProductId || !itemQuantity) {
      showError("Please select a product and enter a quantity.");
      return;
    }

    const product = products.find((item) => item.id === selectedProductId);
    const quantity = parseFloat(itemQuantity);

    if (!product) {
      showError("Selected product not found.");
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantity must be a positive number.");
      return;
    }

    const existingItemIndex = currentSaleItems.findIndex((item) => item.product_id === selectedProductId);
    const availableStock = getAvailableStock(selectedProductId);

    if (existingItemIndex > -1) {
      const updatedItems = [...currentSaleItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > availableStock) {
        showError(`Adding ${quantity} more would exceed available stock for ${product.name}.`);
        return;
      }

      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: newQuantity * existingItem.unit_price,
      };
      setCurrentSaleItems(updatedItems);
    } else {
      if (quantity > availableStock) {
        showError(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
        return;
      }

      setCurrentSaleItems((prev) => [
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

    setItemQuantity("1");
  };

  const handleRemoveSaleItem = (productId: string) => {
    setCurrentSaleItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const calculateCartTotal = useMemo(() => {
    return currentSaleItems.reduce((total, item) => total + item.subtotal, 0);
  }, [currentSaleItems]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  }, [payments]);

  const remainingDue = useMemo(() => {
    return Math.max(calculateCartTotal - totalPaid, 0);
  }, [calculateCartTotal, totalPaid]);

  const addPaymentRow = () => {
    if (receivableAccounts.length === 0) return;
    setPayments((prev) => [...prev, { account_id: receivableAccounts[0].id, amount: "" }]);
  };

  const removePaymentRow = (idx: number) => {
    setPayments((prev) => prev.filter((_, index) => index !== idx));
  };

  const updatePayment = (idx: number, patch: Partial<SplitPayment>) => {
    setPayments((prev) => prev.map((payment, index) => (index === idx ? { ...payment, ...patch } : payment)));
  };

  const handleSubmitSale = async () => {
    if (!saleDate || currentSaleItems.length === 0 || receivableAccounts.length === 0) {
      showError("Sale date and at least one item are required.");
      return;
    }

    const normalizedPayments = payments
      .map((payment) => ({
        account_id: payment.account_id,
        amount: Number(payment.amount),
      }))
      .filter((payment) => payment.account_id && Number.isFinite(payment.amount) && payment.amount > 0);

    if (normalizedPayments.length === 0) {
      showError("Please add at least one payment amount.");
      return;
    }

    if (totalPaid > calculateCartTotal + 0.00001) {
      showError("Total paid cannot exceed sale total.");
      return;
    }

    await onRecordSale({
      customer_name: customerName.trim() || undefined,
      sale_date: saleDate.toISOString(),
      payment_method: "Split",
      received_into_account_id: normalizedPayments[0]?.account_id || null,
      notes: saleNotes.trim() || undefined,
      sale_items: currentSaleItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      payments: normalizedPayments,
    });

    if (!editingSale) {
      resetForm();
    }
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>{editingSale ? "Edit Sale" : "Record New Sale"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="sale-date">Sale Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="sale-date"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !saleDate && "text-muted-foreground",
                )}
                disabled={!canManageDailySales || isProcessing}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={saleDate} onSelect={setSaleDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="customer-name">Customer Name (Optional)</Label>
          <Input
            id="customer-name"
            placeholder="e.g., John Doe"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={!canManageDailySales || isProcessing}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Receiving Accounts (Split Payments)</Label>
          <div className="space-y-2">
            {payments.map((payment, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <Select
                    value={payment.account_id}
                    onValueChange={(value) => updatePayment(idx, { account_id: value })}
                    disabled={!canManageDailySales || isProcessing || receivableAccounts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Financial Accounts</SelectLabel>
                        {receivableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={payment.amount}
                    onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                    disabled={!canManageDailySales || isProcessing}
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePaymentRow(idx)}
                    disabled={!canManageDailySales || isProcessing || payments.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={addPaymentRow}
                disabled={!canManageDailySales || isProcessing || receivableAccounts.length === 0}
              >
                Add payment row
              </Button>
              <div className="text-sm text-muted-foreground">
                Paid: <span className="font-medium">{currency.symbol}{totalPaid.toFixed(2)}</span> • Remaining: <span className="font-medium">{currency.symbol}{remainingDue.toFixed(2)}</span>
              </div>
            </div>

            {receivableAccounts.length === 0 ? (
              <p className="text-sm text-destructive">
                No financial accounts found that can receive payments. Please enable one in Admin Settings.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sale-notes">Notes (Optional)</Label>
          <Input
            id="sale-notes"
            placeholder="Any additional notes for the sale"
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            disabled={!canManageDailySales || isProcessing}
          />
        </div>

        <h3 className="mt-4 text-md font-semibold">Add Items to Sale</h3>
        <div className="flex gap-2">
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
            disabled={!canManageDailySales || products.length === 0 || isProcessing}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Products</SelectLabel>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({getAvailableStock(product.id)} available)
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
            disabled={!canManageDailySales || isProcessing}
          />
          <Button
            onClick={handleAddSaleItem}
            size="icon"
            disabled={!canManageDailySales || !selectedProductId || !itemQuantity || products.length === 0 || isProcessing}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>

        {currentSaleItems.length > 0 ? (
          <div className="mt-4 rounded-md border">
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
                {currentSaleItems.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}
                      {item.unit_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}
                      {item.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSaleItem(item.product_id)}
                        disabled={isProcessing}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">
                    {currency.symbol}
                    {calculateCartTotal.toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          {editingSale ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelEdit} disabled={isProcessing}>
              Cancel Edit
            </Button>
          ) : null}
          <Button
            onClick={handleSubmitSale}
            className="flex-1"
            disabled={!canManageDailySales || isProcessing || currentSaleItems.length === 0 || !saleDate || receivableAccounts.length === 0}
          >
            {isProcessing ? (editingSale ? "Updating Sale..." : "Recording Sale...") : editingSale ? "Update Sale" : "Record Sale"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleForm;
