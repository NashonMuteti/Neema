"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { showError, showSuccess } from "@/utils/toast";
import { Member, FinancialAccount, Pledge } from "@/types/common";
import { parseISO } from "date-fns";

interface PledgeRowWithProfile {
  id: string;
  member_id: string;
  amount: number; // This is original_amount
  paid_amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string; email: string } | null;
  comments?: string;
}

interface UseProjectPledgesProps {
  projectId: string;
  projectName: string;
  onPledgesUpdated: () => void; // Callback for parent component
}

export const useProjectPledges = ({ projectId, projectName, onPledgesUpdated }: UseProjectPledgesProps) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const canManagePledges = React.useMemo(() => {
    if (!currentUser || !definedRoles) return false;
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    return currentUserPrivileges.includes("Manage Pledges");
  }, [currentUser, definedRoles]);

  const invalidateDashboardQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
    queryClient.invalidateQueries({ queryKey: ['projectFinancialSummary', projectId] }); // Invalidate specific project financials
  }, [queryClient, projectId]);

  // Fetch Pledges
  const { data: pledges, isLoading: isLoadingPledges, error: pledgesError, refetch: refetchPledges } = useQuery<Pledge[], Error>({
    queryKey: ['projectPledges', projectId],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from('project_pledges')
        .select(`
          id,
          member_id,
          amount,
          paid_amount,
          due_date,
          status,
          comments,
          profiles ( name, email )
        `)
        .eq('project_id', projectId)
        .order('due_date', { ascending: false })) as { data: PledgeRowWithProfile[] | null, error: any };

      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        member_id: p.member_id,
        project_id: projectId,
        member_name: p.profiles?.name || 'Unknown Member',
        original_amount: p.amount,
        paid_amount: p.paid_amount,
        due_date: parseISO(p.due_date),
        status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid",
        project_name: projectName,
        comments: p.comments || undefined,
      }));
    },
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch Members
  const { data: members, isLoading: isLoadingMembers, error: membersError } = useQuery<Member[], Error>({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch Financial Accounts
  const { data: financialAccounts, isLoading: isLoadingAccounts, error: accountsError } = useQuery<FinancialAccount[], Error>({
    queryKey: ['financialAccounts', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance, initial_balance, profile_id, can_receive_payments') // Added can_receive_payments
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isProcessing = isLoadingPledges || isLoadingMembers || isLoadingAccounts;
  const anyError = pledgesError || membersError || accountsError;

  // Add Pledge Mutation
  const addPledgeMutation = useMutation<void, Error, { member_id: string; amount: number; due_date: Date }>({
    mutationFn: async (pledgeData) => {
      if (!currentUser) throw new Error("User not logged in to record a pledge.");
      const { error: insertError } = await supabase
        .from('project_pledges')
        .insert({
          member_id: pledgeData.member_id,
          project_id: projectId,
          amount: pledgeData.amount,
          paid_amount: 0,
          due_date: pledgeData.due_date.toISOString(),
          status: "Active",
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      showSuccess("New pledge added successfully!");
      refetchPledges();
      onPledgesUpdated();
      invalidateDashboardQueries();
    },
    onError: (err) => {
      console.error("Error adding new pledge:", err);
      showError(`Failed to add new pledge: ${err.message}`);
    },
  });

  // Mark Pledge as Paid Mutation
  const markPledgeAsPaidMutation = useMutation<void, Error, { pledgeId: string; amountPaid: number; receivedIntoAccountId: string; paymentDate: Date }>({
    mutationFn: async ({ pledgeId, amountPaid, receivedIntoAccountId, paymentDate }) => {
      if (!currentUser) throw new Error("User not logged in to mark pledges as paid.");
      if (!canManagePledges) throw new Error("You do not have permission to mark pledges as paid.");

      const { error: rpcError } = await supabase.rpc('record_pledge_payment_atomic', {
        p_pledge_id: pledgeId,
        p_amount_paid: amountPaid,
        p_received_into_account_id: receivedIntoAccountId,
        p_actor_profile_id: currentUser.id,
        p_payment_date: paymentDate.toISOString(),
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: (_, variables) => {
      showSuccess(`Pledge payment of ${currency.symbol}${variables.amountPaid.toFixed(2)} recorded successfully!`);
      refetchPledges();
      onPledgesUpdated();
      invalidateDashboardQueries();
    },
    onError: (err) => {
      console.error("Error recording pledge payment:", err);
      showError(`Failed to record pledge payment: ${err.message}`);
    },
  });

  // Delete Pledge Mutation
  const deletePledgeMutation = useMutation<void, Error, string>({
    mutationFn: async (pledgeId) => {
      if (!currentUser) throw new Error("User not logged in to delete pledges.");
      if (!canManagePledges) throw new Error("You do not have permission to delete pledges.");

      const pledgeToDelete = pledges?.find(p => p.id === pledgeId);
      if (!pledgeToDelete) throw new Error("Pledge not found.");

      if (pledgeToDelete.paid_amount > 0) {
        const { error: rpcError } = await supabase.rpc('reverse_paid_pledge_atomic', {
          p_pledge_id: pledgeId,
          p_profile_id: currentUser.id,
        });
        if (rpcError) throw rpcError;
      } else {
        const { error: deleteError } = await supabase
          .from('project_pledges')
          .delete()
          .eq('id', pledgeId);
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => {
      showSuccess("Pledge deleted successfully!");
      refetchPledges();
      onPledgesUpdated();
      invalidateDashboardQueries();
    },
    onError: (err) => {
      console.error("Error deleting pledge:", err);
      showError(`Failed to delete pledge: ${err.message}`);
    },
  });

  return {
    pledges: pledges || [],
    members: members || [],
    financialAccounts: financialAccounts || [],
    isLoading: isProcessing,
    error: anyError?.message || pledgesError?.message || membersError?.message || accountsError?.message || null,
    canManagePledges,
    addPledge: addPledgeMutation.mutateAsync,
    markPledgeAsPaid: markPledgeAsPaidMutation.mutateAsync,
    deletePledge: deletePledgeMutation.mutateAsync,
  };
};