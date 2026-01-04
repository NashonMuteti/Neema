"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format, getMonth, getYear, parseISO } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, Search } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number;
}

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleTransaction {
  id: string;
  customer_name?: string;
  sale_date: Date;
  total_amount: number;
  payment_method: string;
  received_into_account_id: string;
  account_name: string; // Joined from financial_accounts
  notes?: string;
  profile_id: string;
  sale_items: SaleItem[]; // Joined from sale_items
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "online-payment", label: "Online Payment" },
  { value: "mobile-money", label: "Mobile Money" },
];

const DailySales = () => {
  const { currentUser, session } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const { canManageDailySales } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageDailySales: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageDailySales = currentUserPrivileges.includes("Manage Daily Sales");
    return { canManageDailySales };
  }, [currentUser, definedRoles]);

  const [products, setProducts] = useState<Product[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states for new sale
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  const [customerName, setCustomerName] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(paymentMethods[0]?.value);
  const [selectedReceivedIntoAccount, setSelectedReceivedIntoAccount] = useState<string | undefined>(undefined);
  const [saleNotes, setSaleNotes] = useState("");
  const [currentSaleItems, setCurrentSaleItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [itemQuantity, setItemQuantity] = useState("1");

  // Filter states for sales table
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Fetch Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, current_stock')
      .order('name', { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      showError("Failed to load products.");
    } else {
      setProducts(productsData || []);
      if (productsData && productsData.length > 0 && !selectedProductId) {
        setSelectedProductId(productsData[0].id);
      }
    }

    // Fetch Financial Accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance')
      .eq('profile_id', currentUser.id) // Only show accounts owned by the current user
      .order('name', { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0 && !selectedReceivedIntoAccount) {
        setSelectedReceivedIntoAccount(accountsData[0].id);
      }
    }

    // Fetch Sales Transactions
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    let salesQuery = supabase
      .from('sales_transactions')
      .select(`
        id,
        customer_name,
        sale_date,
        total_amount,
        payment_method,
        received_into_account_id,
        notes,
        profile_id,
        financial_accounts(name),
        sale_items(product_id, quantity, unit_price, subtotal, products(name))
      `)
      .gte('sale_date', startOfMonth.toISOString())
      .lte('sale_date', endOfMonth.toISOString());

    if (!currentUser || (currentUser.role !== "Admin" && currentUser.role !== "Super Admin")) {
      salesQuery = salesQuery.eq('profile_id', currentUser.id);
    }

    if (searchQuery) {
      salesQuery = salesQuery.or(`customer_name.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
    }

    const { data: salesData, error: salesError } = await salesQuery.order('sale_date', { ascending: false });

    if (salesError) {
      console.error("Error fetching sales transactions:", salesError);
      setError("Failed to load sales transactions.");
      showError("Failed to load sales transactions.");
      setSalesTransactions([]);
    } else {
      const fetchedSales: SaleTransaction[] = (salesData || []).map((sale: any) => ({
        id: sale.id,
        customer_name: sale.customer_name || undefined,
        sale_date: parseISO(sale.sale_date),
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        received_into_account_id: sale.received_into_account_id,
        account_name: sale.financial_accounts?.name || 'Unknown Account',
        notes: sale.notes || undefined,
        profile_id: sale.profile_id,
        sale_items: (sale.sale_items || []).map((item: any) => ({
          product_id: item.product_id,
          product_name: item.products?.name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      }));
      setSalesTransactions(fetchedSales);
    }
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery, selectedProductId, selectedReceivedIntoAccount]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
  };

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

    const existingItemIndex = currentSaleItems.findIndex(item => item.product_id === selectedProductId);
    if (existingItemIndex > -1) {
      const updatedItems = [...currentSaleItems];
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
      setCurrentSaleItems(updatedItems);
    } else {
      setCurrentSaleItems(prev => [
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
    setCurrentSaleItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const calculateCartTotal = useMemo(() => {
    return currentSaleItems.reduce((total, item) => total + item.subtotal, 0);
  }, [currentSaleItems]);

  const handleRecordSale = async () => {
    if (!canManageDailySales) {
      showError("You do not have permission to record sales.");
      return;
    }
    if (!saleDate || !selectedPaymentMethod || !selectedReceivedIntoAccount || currentSaleItems.length === 0) {
      showError("Sale date, payment method, received account, and at least one item are required.");
      return;
    }
    if (!currentUser || !session) {
      showError("You must be logged in to record a sale.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading("Recording sale...");

    try {
      const salePayload = {
        customer_name: customerName.trim() || undefined,
        sale_date: saleDate.toISOString(),
        payment_method: selectedPaymentMethod,
        received_into_account_id: selectedReceivedIntoAccount,
        notes: saleNotes.trim() || undefined,
        sale_items: currentSaleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      };

      const { data, error: edgeFunctionError } = await supabase.functions.invoke('record-daily-sale', {
        body: JSON.stringify(salePayload),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (edgeFunctionError) {
        console.error("Error from Edge Function:", edgeFunctionError);
        showError(`Failed to record sale: ${edgeFunctionError.message}`);
        return;
      }
      if (data.error) {
        console.error("Error from Edge Function response:", data.error);
        showError(`Failed to record sale: ${data.error}`);
        return;
      }

      showSuccess("Sale recorded successfully!");
      // Reset form
      setSaleDate(new Date());
      setCustomerName("");
      setSelectedPaymentMethod(paymentMethods[0]?.value);
      setSelectedReceivedIntoAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setSaleNotes("");
      setCurrentSaleItems([]);
      setSelectedProductId(products.length > 0 ? products[0].id : undefined);
      setItemQuantity("1");

      fetchInitialData(); // Re-fetch data to update tables and stock
      invalidateDashboardQueries(); // Invalidate dashboard queries
    } catch (err: any) {
      console.error("Unexpected error recording sale:", err);
      showError(`An unexpected error occurred: ${err.message || 'Please try again.'}`);
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
        <p className="text-lg text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Daily Sales</h1>
      <p className="text-lg text-muted-foreground">
        Record and track daily sales transactions.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record New Sale Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sale-date">Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="sale-date"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !saleDate && "text-muted-foreground"
                    )}
                    disabled={!canManageDailySales || isProcessing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={setSaleDate}
                    initialFocus
                  />
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
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} disabled={!canManageDailySales || isProcessing}>
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
              <Select value={selectedReceivedIntoAccount} onValueChange={setSelectedReceivedIntoAccount} disabled={!canManageDailySales || financialAccounts.length === 0 || isProcessing}>
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
              <Label htmlFor="sale-notes">Notes (Optional)</Label>
              <Input
                id="sale-notes"
                placeholder="Any additional notes for the sale"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                disabled={!canManageDailySales || isProcessing}
              />
            </div>

            <h3 className="text-md font-semibold mt-4">Add Items to Sale</h3>
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId} disabled={!canManageDailySales || products.length === 0 || isProcessing}>
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
                disabled={!canManageDailySales || isProcessing}
              />
              <Button onClick={handleAddSaleItem} size="icon" disabled={!canManageDailySales || !selectedProductId || !itemQuantity || products.length === 0 || isProcessing}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>

            {currentSaleItems.length > 0 && (
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
                    {currentSaleItems.map((item, index) => (
                      <TableRow key={item.product_id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{item.subtotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveSaleItem(item.product_id)} disabled={isProcessing}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{currency.symbol}{calculateCartTotal.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <Button
              onClick={handleRecordSale}
              className="w-full mt-6"
              disabled={!canManageDailySales || isProcessing || currentSaleItems.length === 0 || !saleDate || !selectedPaymentMethod || !selectedReceivedIntoAccount || financialAccounts.length === 0}
            >
              {isProcessing ? "Recording Sale..." : "Record Sale"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Sales Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Sales Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="grid gap-1.5 flex-1 min-w-[120px]">
                <Label htmlFor="sales-filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="sales-filter-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[100px]">
                <Label htmlFor="sales-filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="sales-filter-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center flex-1 min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Search customer/notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  id="sales-search-query"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {salesTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {/* {canManageDailySales && <TableHead className="text-center">Actions</TableHead>} */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesTransactions.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(sale.sale_date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{sale.customer_name || "-"}</TableCell>
                      <TableCell>
                        {sale.sale_items.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                      </TableCell>
                      <TableCell className="capitalize">{sale.payment_method.replace(/-/g, " ")}</TableCell>
                      <TableCell>{sale.account_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{sale.total_amount.toFixed(2)}</TableCell>
                      {/* {canManageDailySales && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="ghost" size="icon" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" disabled>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )} */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No sales transactions found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailySales;