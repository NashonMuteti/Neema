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
import { PlusCircle, Edit, Trash2, Search, DollarSign } from "lucide-react";
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
import AddEditDebtDialog, { Debt } from "@/components/sales-management/AddEditDebtDialog";
import RecordDebtPaymentDialog from "@/components/sales-management/RecordDebtPaymentDialog";
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce
import { format } from "date-fns"; // Added import for format
import { Member, FinancialAccount } from "@/types/common"; // Added import for Member and FinancialAccount

const Debts = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();

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
  const [members, setMembers] = useState<Member[]>([]); // State for members
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]); // State for financial accounts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [localSearchQuery, setLocalSearchQuery] = useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [isAddEditDebtDialogOpen, setIsAddEditDebtDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [deletingDebtId, setDeletingDebtId] = useState<string | undefined>(undefined);
  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false); // New state for processing

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch Members
    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members for debt association.");
    } else {
      setMembers(membersData || []);
    }

    // Fetch Financial Accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance, can_receive_payments')
      .order('name', { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(accountsData || []);
    }

    let query = supabase.from('debts').select(`
      *,
      created_by_profile:profiles!debts_created_by_profile_id_fkey(name, email),
      debtor_profile:profiles!debts_debtor_profile_id_fkey(name, email),
      sales_transactions(notes)
    `);

    if (debouncedSearchQuery) { // Use debounced query
      query = query.or(`customer_name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching debts:", error);
      setError("Failed to load debts.");
      showError("Failed to load debts.");
      setDebts([]);
    } else {
      setDebts((data || []).map((d: any) => ({
        id: d.id,
        created_by_profile_id: d.created_by_profile_id,
        sale_id: d.sale_id || undefined,
        debtor_profile_id: d.debtor_profile_id || undefined,
        customer_name: d.customer_name || undefined,
        description: d.description,
        original_amount: d.original_amount,
        amount_due: d.amount_due,
        due_date: d.due_date ? parseISO(d.due_date) : undefined,
        status: d.status,
        notes: d.notes || undefined,
        created_at: parseISO(d.created_at),
        created_by_name: d.created_by_profile?.name || d.created_by_profile?.email || 'N/A',
        debtor_name: d.debtor_profile?.name || d.debtor_profile?.email || d.customer_name || 'N/A',
        sale_description: d.sales_transactions?.notes || undefined,
      })) || []);
    }
    setLoading(false);
  }, [debouncedSearchQuery, currentUser]); // Depend on debounced query and currentUser

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSaveDebt = async (debtData: Omit<Debt, 'id' | 'created_at' | 'created_by_name' | 'debtor_name' | 'sale_description' | 'created_by_profile_id'> & { id?: string }) => {
    if (!currentUser) {
      showError("You must be logged in to manage debts.");
      return;
    }

    setIsProcessing(true);

    if (debtData.id) {
      // Update existing debt
      const { error } = await supabase
        .from('debts')
        .update({
          customer_name: debtData.customer_name,
          description: debtData.description,
          original_amount: debtData.original_amount,
          amount_due: debtData.amount_due, // This should be managed by payments, but for initial edit, it might be set
          due_date: debtData.due_date?.toISOString() || null,
          debtor_profile_id: debtData.debtor_profile_id || null,
          notes: debtData.notes || null,
          status: debtData.status,
        })
        .eq('id', debtData.id);
      
      if (error) {
        console.error("Error updating debt:", error);
        showError("Failed to update debt.");
      } else {
        showSuccess("Debt updated successfully!");
        fetchInitialData();
      }
    } else {
      // Add new debt
      const { error } = await supabase
        .from('debts')
        .insert({
          created_by_profile_id: currentUser.id,
          customer_name: debtData.customer_name || null,
          description: debtData.description,
          original_amount: debtData.original_amount,
          amount_due: debtData.original_amount, // New debts start with amount_due equal to original_amount
          due_date: debtData.due_date?.toISOString() || null,
          debtor_profile_id: debtData.debtor_profile_id || null,
          notes: debtData.notes || null,
          status: "Outstanding", // New debts are outstanding by default
        });
      
      if (error) {
        console.error("Error adding debt:", error);
        showError("Failed to add debt.");
      } else {
        showSuccess("Debt added successfully!");
        fetchInitialData();
      }
    }
    setIsProcessing(false);
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebtId || !currentUser) {
      showError("No debt selected for deletion or user not logged in.");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', deletingDebtId);

    if (error) {
      console.error("Error deleting debt:", error);
      showError("Failed to delete debt.");
    } else {
      showSuccess("Debt deleted successfully!");
      setDeletingDebtId(undefined);
      fetchInitialData();
    }
    setIsProcessing(false);
  };

  const handleRecordPayment = async (paymentData: {
    debtId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    receivedIntoAccountId: string;
    notes?: string;
  }) => {
    if (!currentUser) {
      showError("You must be logged in to record payments.");
      return;
    }

    setIsProcessing(true);

    const { error: rpcError } = await supabase.rpc('record_debt_payment_atomic', {
      p_debt_id: paymentData.debtId,
      p_amount: paymentData.amount,
      p_payment_date: paymentData.paymentDate.toISOString(),
      p_payment_method: paymentData.paymentMethod,
      p_received_into_account_id: paymentData.receivedIntoAccountId,
      p_notes: paymentData.notes || null,
      p_actor_profile_id: currentUser.id,
    });

    if (rpcError) {
      console.error("Error recording debt payment:", rpcError);
      showError(`Failed to record debt payment: ${rpcError.message}`);
    } else {
      showSuccess(`Payment of ${currency.symbol}${paymentData.amount.toFixed(2)} recorded successfully!`);
      fetchInitialData(); // Re-fetch to update the list and status
    }
    setIsProcessing(false);
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setIsAddEditDebtDialogOpen(true);
  };

  const openDeleteDialog = (debtId: string) => {
    setDeletingDebtId(debtId);
  };

  const openRecordPaymentDialog = (debt: Debt) => {
    setSelectedDebtForPayment(debt);
    setIsRecordPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Debts Management</h1>
        <p className="text-lg text-muted-foreground">Loading debts...</p>
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
        Track and manage outstanding debts owed to your organization.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Debt List</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search customer or description..."
                value={localSearchQuery} // Use local state for input
                onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
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
          {debts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Debtor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageDebts && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.debtor_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{debt.description || "-"}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{debt.original_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{(debt.original_amount - debt.amount_due).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currency.symbol}{debt.amount_due.toFixed(2)}
                    </TableCell>
                    <TableCell>{debt.due_date ? format(debt.due_date, "MMM dd, yyyy") : "-"}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${debt.status === "Paid" ? "text-green-600" : debt.status === "Overdue" ? "text-destructive" : "text-yellow-600"}`}>
                        {debt.status}
                      </span>
                    </TableCell>
                    {canManageDebts && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          {debt.amount_due > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRecordPaymentDialog(debt)}
                              disabled={isProcessing}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(debt)} disabled={isProcessing}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(debt.id)} disabled={isProcessing}>
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
            <p className="text-muted-foreground text-center mt-4">No debts found matching your search or filters.</p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Debt Dialog */}
      <AddEditDebtDialog
        isOpen={isAddEditDebtDialogOpen}
        setIsOpen={setIsAddEditDebtDialogOpen}
        initialData={editingDebt}
        onSave={handleSaveDebt}
        canManageDebts={canManageDebts}
        members={members} {/* Pass members here */}
      />

      {/* Record Payment Dialog */}
      {selectedDebtForPayment && (
        <RecordDebtPaymentDialog
          isOpen={isRecordPaymentDialogOpen}
          setIsOpen={setIsRecordPaymentDialogOpen}
          debt={selectedDebtForPayment}
          onRecordPayment={handleRecordPayment}
          canManageDebts={canManageDebts}
          financialAccounts={financialAccounts} {/* Pass financialAccounts here */}
          isProcessing={isProcessing}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDebtId} onOpenChange={(open) => !open && setDeletingDebtId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the debt record.
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