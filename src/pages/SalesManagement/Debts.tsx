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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [localSearchQuery, setLocalSearchQuery] = useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [isAddEditDebtDialogOpen, setIsAddEditDebtDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [deletingDebtId, setDeletingDebtId] = useState<string | undefined>(undefined);
  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | undefined>(undefined);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('debts').select('*');

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
      setDebts(data || []);
    }
    setLoading(false);
  }, [debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleSaveDebt = async (debtData: Omit<Debt, 'id' | 'profile_id'> & { id?: string; profile_id?: string }) => {
    if (!currentUser) {
      showError("You must be logged in to manage debts.");
      return;
    }

    if (debtData.id) {
      // Update existing debt
      const { error } = await supabase
        .from('debts')
        .update({
          customer_name: debtData.customer_name,
          amount_owed: debtData.amount_owed,
          amount_paid: debtData.amount_paid,
          due_date: debtData.due_date,
          description: debtData.description,
          status: debtData.status,
        })
        .eq('id', debtData.id)
        .eq('profile_id', debtData.profile_id || currentUser.id);
      
      if (error) {
        console.error("Error updating debt:", error);
        showError("Failed to update debt.");
      } else {
        showSuccess("Debt updated successfully!");
        fetchDebts();
      }
    } else {
      // Add new debt
      const { error } = await supabase
        .from('debts')
        .insert({
          profile_id: currentUser.id,
          customer_name: debtData.customer_name,
          amount_owed: debtData.amount_owed,
          amount_paid: 0, // New debts start with 0 paid
          due_date: debtData.due_date,
          description: debtData.description,
          status: "Outstanding", // New debts are outstanding by default
        });
      
      if (error) {
        console.error("Error adding debt:", error);
        showError("Failed to add debt.");
      } else {
        showSuccess("Debt added successfully!");
        fetchDebts();
      }
    }
  };

  const handleDeleteDebt = async () => {
    if (deletingDebtId) {
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
        fetchDebts();
      }
    }
  };

  const handleRecordPayment = async (debtId: string, paymentAmount: number, receivedIntoAccountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to record payments.");
      return;
    }

    const debtToUpdate = debts.find(d => d.id === debtId);
    if (!debtToUpdate) {
      showError("Debt not found.");
      return;
    }

    const newAmountPaid = debtToUpdate.amount_paid + paymentAmount;
    let newStatus = debtToUpdate.status;
    if (newAmountPaid >= debtToUpdate.amount_owed) {
      newStatus = "Paid";
    }

    // Use the atomic RPC function for debt payments
    const { error: rpcError } = await supabase.rpc('record_debt_payment_atomic', {
      p_debt_id: debtId,
      p_amount_paid: paymentAmount,
      p_received_into_account_id: receivedIntoAccountId,
      p_actor_profile_id: currentUser.id,
    });

    if (rpcError) {
      console.error("Error recording debt payment:", rpcError);
      showError(`Failed to record debt payment: ${rpcError.message}`);
    } else {
      showSuccess(`Payment of ${currency.symbol}${paymentAmount.toFixed(2)} recorded successfully!`);
      fetchDebts(); // Re-fetch to update the list and status
    }
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
                  <TableHead className="w-[150px]">Customer Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount Owed</TableHead>
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
                    <TableCell className="font-medium">{debt.customer_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{debt.description || "-"}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{debt.amount_owed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{debt.amount_paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currency.symbol}{(debt.amount_owed - debt.amount_paid).toFixed(2)}
                    </TableCell>
                    <TableCell>{debt.due_date ? format(new Date(debt.due_date), "MMM dd, yyyy") : "-"}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${debt.status === "Paid" ? "text-green-600" : debt.status === "Overdue" ? "text-destructive" : "text-yellow-600"}`}>
                        {debt.status}
                      </span>
                    </TableCell>
                    {canManageDebts && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          {debt.status !== "Paid" && (
                            <Button variant="outline" size="sm" onClick={() => openRecordPaymentDialog(debt)}>
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(debt)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(debt.id)}>
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
            <p className="text-muted-foreground text-center mt-4">No debts found matching your search.</p>
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
      />

      {/* Record Payment Dialog */}
      {selectedDebtForPayment && (
        <RecordDebtPaymentDialog
          isOpen={isRecordPaymentDialogOpen}
          setIsOpen={setIsRecordPaymentDialogOpen}
          debt={selectedDebtForPayment}
          onRecordPayment={handleRecordPayment}
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
            <AlertDialogAction onClick={handleDeleteDebt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Debts;