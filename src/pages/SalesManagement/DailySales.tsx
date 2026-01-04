"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getMonth, getYear, parseISO, format } from "date-fns"; // Added format import
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

import SaleForm from "@/components/sales-management/SaleForm";
import SalesTable from "@/components/sales-management/SalesTable";

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
  account_name: string;
  notes?: string;
  profile_id: string;
  sale_items: SaleItem[];
}

const DailySales = () => {
  const { currentUser, session } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
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
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
  };

  const handleRecordSale = async (payload: {
    customer_name?: string;
    sale_date: string;
    payment_method: string;
    received_into_account_id: string;
    notes?: string;
    sale_items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }) => {
    if (!canManageDailySales) {
      showError("You do not have permission to record sales.");
      return;
    }
    if (!currentUser || !session) {
      showError("You must be logged in to record a sale.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading("Recording sale...");

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('record-daily-sale', {
        body: JSON.stringify(payload),
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
        <SaleForm
          products={products}
          financialAccounts={financialAccounts}
          canManageDailySales={canManageDailySales}
          isProcessing={isProcessing}
          onRecordSale={handleRecordSale}
        />

        <SalesTable
          salesTransactions={salesTransactions}
          canManageDailySales={canManageDailySales}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          months={months}
          years={years}
        />
      </div>
    </div>
  );
};

export default DailySales;