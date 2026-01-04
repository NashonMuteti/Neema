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
import { Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  current_stock: number;
  reorder_point: number;
  profile_id: string;
}

interface AddEditProductDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialData?: Product; // For editing existing product
  onSave: (product: Omit<Product, 'id' | 'profile_id'> & { id?: string; profile_id?: string }) => void;
  canManageStocks: boolean;
}

const AddEditProductDialog: React.FC<AddEditProductDialogProps> = ({
  isOpen,
  setIsOpen,
  initialData,
  onSave,
  canManageStocks,
}) => {
  const { currency } = useSystemSettings();

  const [name, setName] = React.useState(initialData?.name || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [sku, setSku] = React.useState(initialData?.sku || "");
  const [price, setPrice] = React.useState(initialData?.price.toString() || "0");
  const [currentStock, setCurrentStock] = React.useState(initialData?.current_stock.toString() || "0");
  const [reorderPoint, setReorderPoint] = React.useState(initialData?.reorder_point.toString() || "0");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
      setSku(initialData?.sku || "");
      setPrice(initialData?.price.toString() || "0");
      setCurrentStock(initialData?.current_stock.toString() || "0");
      setReorderPoint(initialData?.reorder_point.toString() || "0");
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      showError("Product Name is required.");
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showError("Price must be a non-negative number.");
      return;
    }
    const parsedCurrentStock = parseFloat(currentStock);
    if (isNaN(parsedCurrentStock) || parsedCurrentStock < 0) {
      showError("Current Stock must be a non-negative number.");
      return;
    }
    const parsedReorderPoint = parseFloat(reorderPoint);
    if (isNaN(parsedReorderPoint) || parsedReorderPoint < 0) {
      showError("Reorder Point must be a non-negative number.");
      return;
    }

    setIsSaving(true);

    const productData: Omit<Product, 'id' | 'profile_id'> & { id?: string; profile_id?: string } = {
      name: name.trim(),
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      price: parsedPrice,
      current_stock: parsedCurrentStock,
      reorder_point: parsedReorderPoint,
    };

    if (initialData?.id) {
      productData.id = initialData.id;
      productData.profile_id = initialData.profile_id; // Keep existing profile_id for updates
    }

    onSave(productData);
    setIsOpen(false);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {initialData ? `Make changes to ${initialData.name}'s details.` : "Enter the details for your new product."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManageStocks || isSaving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="product-description">Description (Optional)</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the product"
              disabled={!canManageStocks || isSaving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="product-sku">SKU (Optional, must be unique)</Label>
            <Input
              id="product-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Stock Keeping Unit"
              disabled={!canManageStocks || isSaving}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="product-price">Price ({currency.symbol})</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!canManageStocks || isSaving}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-current-stock">Current Stock</Label>
              <Input
                id="product-current-stock"
                type="number"
                step="1"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                disabled={!canManageStocks || isSaving}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="product-reorder-point">Reorder Point</Label>
            <Input
              id="product-reorder-point"
              type="number"
              step="1"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              disabled={!canManageStocks || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageStocks || isSaving}>
            <Save className="mr-2 h-4 w-4" /> {initialData ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditProductDialog;