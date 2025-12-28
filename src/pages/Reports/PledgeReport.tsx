"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, CheckCircle } from "lucide-react";
import { format, getMonth, getYear, isBefore, startOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useUserRoles } from "@/context/UserRolesContext"; // New import
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import EditPledgeDialog, { Pledge as EditPledgeDialogPledge } from "@/components/pledges/EditPledgeDialog"; // Import the new dialog and its Pledge type
import MarkPledgeAsPaidDialog from "@/components/pledges/MarkPledgeAsPaidDialog"; // Added this import
import { FinancialAccount } from "@/types/common"; // Import FinancialAccount from common types

// Add interfaces for fetched data
interface Member { id: string; name: string; email: string; } // Added email for dialog
interface Project { id: string; name: string; }
interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid"; // Updated: Removed "Overdue"
  member_name: string;
  project_name: string;
  comments?: string; // Added comments
}

// Define the expected structure of a pledge row with joined profile and project data
interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue"; // Fixed: Added "Overdue"
  profiles: { name: string; email: string } | null; // Joined profile data, added email
  projects: { name: string } | null; // Joined project data
  comments?: string; // Added comments
}

const PledgeReport = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]); // New state for financial accounts
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterStatus, setFilterStatus] = React.useState<"All" | "Paid" | "Unpaid">("All"); // Updated filter options
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  // Helper to determine display status (Unpaid for Active/Overdue)
  const getDisplayPledgeStatus = (pledge: Pledge): "Paid" | "Unpaid" => {
    if (pledge.status === "Paid") return "Paid";
    return "Unpaid";
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email') // Fetch email for dialog
      .order('name', { ascending: true });

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true });

    // Fetch all financial accounts (not filtered by currentUser.id)
    let financialAccountsData: FinancialAccount[] = [];
    if (currentUser) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance, initial_balance, profile_id') // Added initial_balance and profile_id
        .order('name', { ascending: true });

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        showError("Failed to load financial accounts.");
      } else {
        financialAccountsData = (accountsData || []) as FinancialAccount[];
      }
    }
    setFinancialAccounts(financialAccountsData);


    if (membersError) { console.error("Error fetching members:", membersError); setError("Failed to load members."); }
    else { setMembers(membersData || []); }

    if (projectsError) { console.error("Error fetching projects:", projectsError); setError("Failed to load projects."); }
    else { setProjects(projectsData || []); }

    // Fetch pledges for the entire selected year, not just a month
    const startOfYear = new Date(parseInt(filterYear), 0, 1);
    const endOfYear = new Date(parseInt(filterYear), 11, 31, 23, 59, 59);

    let query = supabase
      .from('project_pledges')
      .select(`
        id,
        member_id,
        project_id,
        amount,
        due_date,
        status,
        comments,
        profiles ( name, email ),
        projects ( name )
      `)
      .gte('due_date', startOfYear.toISOString())
      .lte('due_date', endOfYear.toISOString());
      
    if (filterStatus === "Paid") {
      query = query.eq('status', 'Paid');
    } else if (filterStatus === "Unpaid") {
      query = query.in('status', ['Active', 'Overdue']);
    }
    // If filterStatus is "All", no status filter is applied to the DB query

    const { data: pledgesData, error: pledgesError } = (await query.order('due_date', { ascending: false })) as { data: PledgeRowWithJoinedData[] | null, error: PostgrestError | null };

    if (pledgesError) {
      console.error("Error fetching pledges:", pledgesError);
      setError("Failed to load pledges.");
      setPledges([]);
    } else {
      const fetchedPledges: Pledge[] = (pledgesData || []).map(p => ({
        id: p.id,
        member_id: p.member_id,
        project_id: p.project_id,
        amount: p.amount,
        due_date: parseISO(p.due_date),
        status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid",
        member_name: p.profiles?.name || 'Unknown Member',
        project_name: p.projects?.name || 'Unknown Project',
        comments: p.comments || undefined,
      }));

      const filteredBySearch = fetchedPledges.filter(pledge => {
        const memberName = (pledge.member_name || "").toLowerCase();
        const projectName = (pledge.project_name || "").toLowerCase();
        const comments = (pledge.comments || "").toLowerCase();
        const matchesSearch = memberName.includes(searchQuery.toLowerCase()) || 
                              projectName.includes(searchQuery.toLowerCase()) ||
                              comments.includes(searchQuery.toLowerCase());
        return matchesSearch;
      });

      // Sort pledges: Unpaid first, then by due_date descending
      const sortedPledges = filteredBySearch.sort((a, b) => {
        const statusA = getDisplayPledgeStatus(a);
        const statusB = getDisplayPledgeStatus(b);

        if (statusA === "Unpaid" && statusB === "Paid") return -1;
        if (statusA === "Paid" && statusB === "Unpaid") return 1;

        return b.due_date.getTime() - a.due_date.getTime(); // Sort by due_date descending
      });

      setPledges(sortedPledges);
    }
    setLoading(false);
  }, [filterYear, filterStatus, searchQuery, currentUser]); // Removed filterMonth from dependencies

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const filteredPledges = React.useMemo(() => {
    return pledges.filter(pledge => {
      const displayStatus = getDisplayPledgeStatus(pledge);
      const matchesStatus = filterStatus === "All" || displayStatus === filterStatus;
      return matchesStatus;
    }).sort((a, b) => b.due_date.getTime() - a.due_date.getTime()); // Sort by due date descending
  }, [pledges, filterStatus]);

  const handleMarkAsPaid = async (id: string, receivedIntoAccountId: string, paymentMethod: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to mark pledges as paid.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to mark pledges as paid.");
      return;
    }

    const pledgeToMark = pledges.find(p => p.id === id);
    if (!pledgeToMark) {
      showError("Pledge not found.");
      return;
    }

    // Use the atomic transfer function for marking as paid
    const { error: transactionError } = await supabase.rpc('transfer_funds_atomic', {
      p_source_account_id: null,
      p_destination_account_id: receivedIntoAccountId,
      p_amount: pledgeToMark.amount,
      p_actor_profile_id: currentUser.id, // The user performing the action
      p_purpose: `Pledge Payment for Project: ${pledgeToMark.project_name}`,
      p_source: `Pledge Payment from Member: ${pledgeToMark.member_name}`,
      p_is_transfer: false,
      p_project_id: pledgeToMark.project_id,
      p_member_id: pledgeToMark.member_id,
      p_payment_method: paymentMethod,
      p_pledge_id: id, // Pass pledge ID to update its status
    });

    if (transactionError) {
      console.error("Error marking pledge as paid and updating balance:", transactionError);
      showError(`Failed to update pledge: ${transactionError.message}`);
    } else {
      showSuccess(`Pledge payment of ${currency.symbol}${pledgeToMark.amount.toFixed(2)} recorded successfully!`);
      fetchReportData(); // Re-fetch all data to update lists
    }
  };

  const handleEditPledge = (updatedPledge: EditPledgeDialogPledge) => { // Changed to use EditPledgeDialogPledge
    // This function is called by the EditPledgeDialog on successful save
    // We just need to re-fetch the data to update the table
    fetchReportData();
  };

  const handleDeletePledge = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to delete pledges.");
      return;
    }

    const pledgeToDelete = pledges.find(p => p.id === id);
    if (!pledgeToDelete) {
      showError("Pledge not found.");
      return;
    }

    if (pledgeToDelete.status === "Paid") {
      // Use the atomic reversal function for paid pledges
      const { error: rpcError } = await supabase.rpc('reverse_paid_pledge_atomic', {
        p_pledge_id: id,
        p_profile_id: currentUser.id,
      });

      if (rpcError) {
        console.error("Error reversing paid pledge:", rpcError);
        showError(`Failed to delete paid pledge: ${rpcError.message}`);
        return;
      }
    } else {
      // For unpaid pledges, proceed with direct deletion
      const { error: deleteError } = await supabase
        .from('project_pledges')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error("Error deleting pledge:", deleteError);
        showError("Failed to delete pledge.");
        return;
      }
    }

    showSuccess("Pledge deleted successfully!");
    fetchReportData(); // Re-fetch all data to update lists
  };

  const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid") => {
    switch (displayStatus) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Unpaid":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-muted-foreground">Loading pledges data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
      <p className="text-lg text-muted-foreground">
        View and manage pledges from members across all projects.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Pledge List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={filterStatus} onValueChange={(value: "All" | "Paid" | "Unpaid") => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="All">All Pledges</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Month</SelectLabel>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Year</SelectLabel>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search member/project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {filteredPledges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Comments</TableHead>
                  {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPledges.map((pledge) => {
                  const displayStatus = getDisplayPledgeStatus(pledge);
                  const memberName = members.find(m => m.id === pledge.member_id)?.name;
                  const projectName = projects.find(p => p.id === pledge.project_id)?.name;
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell className="font-medium">{memberName}</TableCell>
                      <TableCell>{projectName}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{pledge.amount.toFixed(2)}</TableCell>
                      <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(displayStatus)}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{pledge.comments || "-"}</TableCell>
                      {canManagePledges && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            {displayStatus !== "Paid" && (
                              <MarkPledgeAsPaidDialog
                                pledge={pledge}
                                onConfirmPayment={handleMarkAsPaid}
                                financialAccounts={financialAccounts}
                                canManagePledges={canManagePledges}
                              />
                            )}
                            <EditPledgeDialog
                              initialData={pledge as EditPledgeDialogPledge}
                              onSave={handleEditPledge}
                              members={members}
                              projects={projects}
                              financialAccounts={financialAccounts} // Pass financial accounts
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePledge(pledge.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No pledges found for the selected filters or search query.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PledgeReport;