"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Search, CalendarIcon } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
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
import { useQueryClient } from "@tanstack/react-query";
import { format, getMonth, getYear, parseISO, startOfMonth, endOfMonth, isPast, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FinancialAccount, Member, MonthYearOption } from "@/types/common";
import { Label } from "@/components/ui/label"; // Added missing import

import AddEditDebtDialog, { Debt } from "@/components/sales-management/AddEditDebtDialog";
import DebtListTable from "@/components/sales-management/DebtListTable";

const Debts = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const queryClient = useQueryClient();

  const { canManageDebts } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageDebts: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageDebts = currentUserPrivileges.includes("Manage Debts");
    return { canManageDebts };
  }, [currentUser, definedRoles]);

  const [debts, setDebts] = useState<Debt[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states
  const [isAddEditDebtDialogOpen, setIsAddEditDebtDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [deletingDebtId, setDeletingDebtId] = useState<string | undefined>(undefined);

  // Filter states
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());
  const [filterStatus, setFilterStatus] = useState<"All" | "Outstanding" | "Partially Paid" | "Paid" | "Overdue">("All");
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = useState("");

  const months: MonthYearOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years: MonthYearOption[] = Array.from({ length: 5 }, (_, i) => ({
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

    // Fetch Members
    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members.");
    } else {
      setMembers(membersData || []);
    }

    // Fetch Financial Accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id') // Added initial_balance and profile_id
      .eq('profile_id', currentUser.id) // Only show accounts owned by the current user
      .order('name', { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(accountsData || []);
    }

    // Fetch Debts
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    let debtsQuery = supabase
      .from('debts')
      .select(`
        id,
        created_by_profile_id,
        sale_id,
        debtor_profile_id,
        customer_name,
        description,
        original_amount,
        amount_due,
        due_date,
        status,
        notes,
        created_at,
        createdByProfile: profiles!debts_created_by_profile_id_fkey(name, email), -- Creator profile
        debtorProfile: profiles!debts_debtor_profile_id_fkey(name, email), -- Debtor profile
        sales_transactions(notes) -- Sale description
      `)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (filterStatus !== "All") {
      if (filterStatus === "Overdue") {
        debtsQuery = debtsQuery.neq('status', 'Paid').lte('due_date', new Date().toISOString());
      } else {
        debtsQuery = debtsQuery.eq('status', filterStatus);
      }
    }

    if (searchQuery) {
      debtsQuery = debtsQuery.or(`description.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,createdByProfile.name.ilike.%${searchQuery}%,debtorProfile.name.ilike.%${searchQuery}%`);
    }

    const { data: debtsData, error: debtsError } = await debtsQuery.order('due_date', { ascending: true });

    if (debtsError) {
      console.error("Error fetching debts:", debtsError);
      setError("Failed to load debts.");
      showError("Failed to load debts.");
      setDebts([]);
    } else {
      const fetchedDebts: Debt[] = (debtsData || []).map((debt: any) => {
        const createdByProfile = debt.createdByProfile;
        const debtorProfile = debt.debtorProfile;
        const saleTransaction = debt.sales_transactions;

        let status = debt.status as Debt['status'];
        if (status !== "Paid" && debt.due_date && isPast(parseISO(debt.due_date)) && !isSameDay(parseISO(debt.due_date), new Date())) {
          status = "Overdue";
        }

        return {
          id: debt.id,
          created_by_profile_id: debt.created_by_profile_id,
          sale_id: debt.sale_id || undefined,
          debtor_profile_id: debt.debtor_profile_id || undefined,
          customer_name: debt.customer_name || undefined,
          description: debt.description,
          original_amount: debt.original_amount,
          amount_due: debt.amount_due,
          due_date: debt.due_date ? parseISO(debt.due_date) : undefined,
          status: status,
          notes: debt.notes || undefined,
          created_at: parseISO(debt.created_at),
          created_by_name: createdByProfile?.name || createdByProfile?.email || 'Unknown Creator',
          debtor_name: debtorProfile?.name || debtorProfile?.email || undefined,
          sale_description: saleTransaction?.notes || undefined,
        };
      });
      setDebts(fetchedDebts);
    }
    setLoading(false);
  }, [currentUser, filterStatus, filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
  };

  const handleSaveDebt = async (debtData: Omit<Debt, 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description'> & { id?: string }) => {
    if (!canManageDebts) {
      showError("You do not have permission to manage debts.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to manage debts.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading(debtData.id ? "Updating debt..." : "Adding new debt...");

    try {
      if (debtData.id) {
        // Update existing debt
        const { error } = await supabase
          .from('debts')
          .update({
            description: debtData.description,
            original_amount: debtData.original_amount,
            due_date: debtData.due_date?.toISOString() || null,
            debtor_profile_id: debtData.debtor_profile_id || null,
            customer_name: debtData.customer_name || null,
            notes: debtData.notes || null,
            // status and amount_due are updated via payments, not directly here
          })
          .eq('id', debtData.id)
          .eq('created_by_profile_id', currentUser.id); // Ensure user owns the debt record

        if (error) throw error;
        showSuccess("Debt updated successfully!");
      } else {
        // Add new debt
        const { error } = await supabase
          .from('debts')
          .insert({
            created_by_profile_id: currentUser.id,
            description: debtData.description,
            original_amount: debtData.original_amount,
            amount_due: debtData.original_amount, // New debts start with amount_due = original_amount
            due_date: debtData.due_date?.toISOString() || null,
            debtor_profile_id: debtData.debtor_profile_id || null,
            customer_name: debtData.customer_name || null,
            notes: debtData.notes || null,
            status: "Outstanding",
          });

        if (error) throw error;
        showSuccess("Debt added successfully!");
      }
      fetchInitialData();
    } catch (err: any) {
      console.error("Error saving debt:", err);
      showError(`Failed to save debt: ${err.message}`);
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;
    if (!canManageDebts) {
      showError("You do not have permission to delete debts.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to delete debts.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading("Deleting debt...");

    try {
      // First, check if there are any payments associated with this debt
      const { count: paymentsCount, error: paymentsCountError } = await supabase
        .from('debt_payments')
        .select('id', { count: 'exact', head: true })
        .eq('debt_id', deletingDebtId);

      if (paymentsCountError) throw paymentsCountError;

      if (paymentsCount && paymentsCount > 0) {
        showError("Cannot delete debt: Payments have been recorded against it. Please delete payments first.");
        return;
      }

      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', deletingDebtId)
        .eq('created_by_profile_id', currentUser.id); // Ensure user owns the debt record

      if (error) throw error;
      showSuccess("Debt deleted successfully!");
      setDeletingDebtId(undefined);
      fetchInitialData();
    } catch (err: any) {
      console.error("Error deleting debt:", err);
      showError(`Failed to delete debt: ${err.message}`);
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async (paymentData: {
    debtId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    receivedIntoAccountId: string;
    notes?: string;
  }) => {
    if (!canManageDebts) {
      showError("You do not have permission to record payments.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to record payments.");
      return;
    }

    setIsProcessing(true);
    const toastId = showLoading("Recording payment...");

    try {
      // 1. Insert into debt_payments
      const { error: paymentInsertError } = await supabase
        .from('debt_payments')
        .insert({
          debt_id: paymentData.debtId,
          profile_id: currentUser.id,
          amount: paymentData.amount,
          payment_date: paymentData.paymentDate.toISOString(),
          payment_method: paymentData.paymentMethod,
          received_into_account_id: paymentData.receivedIntoAccountId,
          notes: paymentData.notes || null,
        });
      if (paymentInsertError) throw paymentInsertError;

      // 2. Update debt's amount_due and status
      const currentDebt = debts.find(d => d.id === paymentData.debtId);
      if (!currentDebt) throw new Error("Debt not found for payment.");

      const newAmountDue = currentDebt.amount_due - paymentData.amount;
      let newStatus: Debt['status'];
      if (newAmountDue <= 0) {
        newStatus = "Paid";
      } else {
        newStatus = "Partially Paid";
      }

      const { error: debtUpdateError } = await supabase
        .from('debts')
        .update({
          amount_due: newAmountDue,
          status: newStatus,
        })
        .eq('id', paymentData.debtId);
      if (debtUpdateError) throw debtUpdateError;

      // 3. Record income transaction
      const { error: incomeInsertError } = await supabase
        .from('income_transactions')
        .insert({
          profile_id: currentUser.id,
          account_id: paymentData.receivedIntoAccountId,
          amount: paymentData.amount,
          source: `Debt Payment: ${currentDebt.description}`,
          date: paymentData.paymentDate.toISOString(),
        });
      if (incomeInsertError) throw incomeInsertError;

      // 4. Update financial account balance
      const currentAccount = financialAccounts.find(acc => acc.id === paymentData.receivedIntoAccountId);
      if (!currentAccount) throw new Error("Financial account not found for balance update.");

      const newAccountBalance = currentAccount.current_balance + paymentData.amount;
      const { error: accountUpdateError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newAccountBalance })
        .eq('id', paymentData.receivedIntoAccountId);
      if (accountUpdateError) throw accountUpdateError;

      showSuccess("Payment recorded and debt updated successfully!");
      fetchInitialData();
      invalidateDashboardQueries();
    } catch (err: any) {
      console.error("Error recording payment:", err);
      showError(`Failed to record payment: ${err.message}`);
    } finally {
      dismissToast(toastId);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Debts Management</h1>
        <p className="text-lg text-muted-foreground">Loading debts data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Debts Management</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Debts Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage outstanding debts and payment tracking.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Debt List</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search debts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            </div>
            {canManageDebts && (
              <Button onClick={() => { setEditingDebt(undefined); setIsAddEditDebtDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Debt
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="grid gap-1.5 flex-1 min-w-[120px]">
              <Label htmlFor="debt-filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
                <SelectTrigger id="debt-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="All">All Debts</SelectItem>
                    <SelectItem value="Outstanding">Outstanding</SelectItem>
                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 flex-1 min-w-[120px]">
              <Label htmlFor="debt-filter-month">Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger id="debt-filter-month">
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
              <Label htmlFor="debt-filter-year">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger id="debt-filter-year">
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
          </div>

          <DebtListTable
            debts={debts}
            canManageDebts={canManageDebts}
            onEditDebt={(debt) => { setEditingDebt(debt); setIsAddEditDebtDialogOpen(true); }}
            onDeleteDebt={(debtId) => setDeletingDebtId(debtId)}
            onRecordPayment={handleRecordPayment}
            financialAccounts={financialAccounts}
            isProcessing={isProcessing}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Debt Dialog */}
      <AddEditDebtDialog
        isOpen={isAddEditDebtDialogOpen}
        setIsOpen={setIsAddEditDebtDialogOpen}
        initialData={editingDebt}
        onSave={handleSaveDebt}
        canManageDebts={canManageDebts}
        members={members}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDebtId} onOpenChange={(open) => !open && setDeletingDebtId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the debt record. If there are any payments associated with this debt, you must delete them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDebt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isProcessing}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Debts;