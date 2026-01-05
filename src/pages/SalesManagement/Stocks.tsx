"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash2, Search, Package } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import AddEditProductDialog, { Product } from "@/components/sales-management/AddEditProductDialog";
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce

const Stocks = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();

  const { canManageStocks } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageStocks: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageStocks = currentUserPrivileges.includes("Manage Stocks");
    return { canManageStocks };
  }, [currentUser, definedRoles]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [localSearchQuery, setLocalSearchQuery] = useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [isAddEditProductDialogOpen, setIsAddEditProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProductId, setDeletingProductId] = useState<string | undefined>(undefined);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('products').select('*');

    if (debouncedSearchQuery) { // Use debounced query
      query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%,sku.ilike.%${debouncedSearchQuery}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products.");
      showError("Failed to load products.");
      setProducts([]);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }, [debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'profile_id'> & { id?: string; profile_id?: string }) => {
    if (!currentUser) {
      showError("You must be logged in to manage products.");
      return;
    }

    if (productData.id) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          description: productData.description,
          sku: productData.sku,
          price: productData.price,
          current_stock: productData.current_stock,
          reorder_point: productData.reorder_point,
        })
        .eq('id', productData.id)
        .eq('profile_id', productData.profile_id || currentUser.id); // Ensure user owns the product or is admin
      
      if (error) {
        console.error("Error updating product:", error);
        showError("Failed to update product.");
      } else {
        showSuccess("Product updated successfully!");
        fetchProducts();
      }
    } else {
      // Add new product
      const { error } = await supabase
        .from('products')
        .insert({
          profile_id: currentUser.id,
          name: productData.name,
          description: productData.description,
          sku: productData.sku,
          price: productData.price,
          current_stock: productData.current_stock,
          reorder_point: productData.reorder_point,
        });
      
      if (error) {
        console.error("Error adding product:", error);
        showError("Failed to add product.");
      } else {
        showSuccess("Product added successfully!");
        fetchProducts();
      }
    }
  };

  const handleDeleteProduct = async () => {
    if (deletingProductId) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProductId);

      if (error) {
        console.error("Error deleting product:", error);
        showError("Failed to delete product.");
      } else {
        showSuccess("Product deleted successfully!");
        setDeletingProductId(undefined);
        fetchProducts();
      }
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsAddEditProductDialogOpen(true);
  };

  const openDeleteDialog = (productId: string) => {
    setDeletingProductId(productId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Stocks Management</h1>
        <p className="text-lg text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Stocks Management</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Stocks Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage inventory, stock levels, and product availability.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Product List</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search products..."
                value={localSearchQuery} // Use local state for input
                onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            {canManageStocks && (
              <Button onClick={() => { setEditingProduct(undefined); setIsAddEditProductDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  {canManageStocks && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{product.description || "-"}</TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.current_stock <= product.reorder_point ? "text-destructive font-semibold" : ""}>
                        {product.current_stock}
                      </span>
                      {product.current_stock <= product.reorder_point && (
                        <span className="ml-2 text-xs text-destructive">(Low Stock!)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{product.reorder_point}</TableCell>
                    {canManageStocks && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No products found matching your search.</p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <AddEditProductDialog
        isOpen={isAddEditProductDialogOpen}
        setIsOpen={setIsAddEditProductDialogOpen}
        initialData={editingProduct}
        onSave={handleSaveProduct}
        canManageStocks={canManageStocks}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProductId} onOpenChange={(open) => !open && setDeletingProductId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product and all its associated stock movements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Stocks;