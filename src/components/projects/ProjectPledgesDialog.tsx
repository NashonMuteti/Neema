"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, PlusCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format, parseISO } from "date-fns";
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
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import MarkPledgeAsPaidDialog from "@/components/pledges/MarkPledgeAsPaidDialog"; // New import
import { Member, FinancialAccount } from "@/types/common"; // Updated import
import { useQueryClient } from "@tanstack/react-query"; // New import

interface ProjectPledge {
  id: string;
  member_id: string;
  project_id: string; // Added project_id
  member_name: string;
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid";
  project_name: string; // Added for dialog context
  comments?: string; // Added for dialog context
}

interface ProjectPledgesDialogProps {
  projectId: string;
  projectName: string;
  onPledgesUpdated: () => void;
}

interface PledgeRowWithProfile {
  id: string;
  member_id: string;
  amount: number; // This is original_amount
  paid_amount: number; // New field
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string } | null;
  comments?: string; // Added comments
}

const getDisplayPledgeStatus = (pledge: ProjectPledge): "Paid" | "Unpaid" => {
  if (pledge.paid_amount >= pledge.original_amount) return "Paid";
  return "Unpaid";
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

const ProjectPledgesDialog: React.FC<ProjectPledgesDialogProps> = ({
  projectId,
  projectName,
  onPledgesUpdated,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient(); // Initialize queryClient

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [pledges, setPledges] = React.useState<ProjectPledge[]>([]);
  const [loadingPledges, setLoadingPledges] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeMember, setNewPledgeMember] = React.useState<string | undefined>(undefined);
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(new Date());
  const [members, setMembers] = React.useState<Member[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);

  const fetchPledges = React.useCallback(async () => {
    setLoadingPledges(true);
    setError(null);
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
        profiles ( name )
      `)
      .eq('project_id', projectId)) as { data: PledgeRowWithProfile[] | null, error: PostgrestError | null };

    if (error) {
      console.error("Error fetching pledges:", error);
      setError("Failed to load pledges.");
      showError("Failed to load pledges.");
      setPledges([]);
    } else {
      setPledges((data || []).map(p => ({
        id: p.id,
        member_id: p.member_id,
        project_id: projectId, // Explicitly add project_id here
        member_name: p.profiles?.name || 'Unknown Member',
        original_amount: p.amount,
        paid_amount: p.paid_amount,
        due_date: parseISO(p.due_date),
        status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid",
        project_name: projectName, // Add project name for dialog context
        comments: p.comments || undefined,
      })));
    }
    setLoadingPledges(false);
  }, [projectId, projectName]);

  const fetchMembersAndAccounts = React.useCallback(async () => {
    setLoadingMembers(true);
    setLoadingAccounts(true);

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members for pledges.");
    } else {
      setMembers(membersData || []);
      if (membersData && membersData.length > 0 && !newPledgeMember) {
        setNewPledgeMember(membersData[0].id);
      }
    }
    setLoadingMembers(false);

    if (currentUser) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, current_balance, initial_balance, profile_id') // Added initial_balance and profile_id
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        showError("Failed to load financial accounts for pledges.");
      } else {
        setFinancialAccounts((accountsData || []) as FinancialAccount[]);
      }
    }
    setLoadingAccounts(false);
  }, [newPledgeMember, currentUser]);

  React.useEffect(() => {
    if (isOpen) {
      fetchPledges();
      fetchMembersAndAccounts();
    }
  }, [isOpen, fetchPledges, fetchMembersAndAccounts]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
  };

  const handleMarkPledgeAsPaid = async (pledgeId: string, amountPaid: number, receivedIntoAccountId: string, paymentDate: Date) => {
    if (!canManagePledges) {
      showError("You do not have permission to update pledge status.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to mark pledges as paid.");
      return;
    }

    const pledgeToMark = pledges.find(p => p.id === pledgeId);
    if (!pledgeToMark) {
      showError("Pledge not found.");
      return;
    }

    const { error: transactionError } = await supabase.rpc('record_pledge_payment_atomic', {
      p_pledge_id: pledgeId,
      p_amount_paid: amountPaid,
      p_received_into_account_id: receivedIntoAccountId,
      p_actor_profile_id: currentUser.id, // The user performing the action
      p_payment_date: paymentDate.toISOString(),
    });

    if (transactionError) {
      console.error("Error marking pledge as paid and updating balance:", transactionError);
      showError(`Failed to record pledge payment: ${transactionError.message}`);
    } else {
      showSuccess(`Pledge payment of ${currency.symbol}${amountPaid.toFixed(2)} recorded successfully!`);
      fetchPledges(); // Re-fetch pledges to update their paid_amount and status
      onPledgesUpdated(); // Notify parent component (Projects.tsx) to re-fetch its data
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleAddPledge = async () => {
    if (!newPledgeAmount || !newPledgeMember || !newPledgeDueDate) {
      showError("All new pledge fields are required.");
      return;
    }
    if (!currentUser) {
      showError("User not logged in to perform this action.");
      return;
    }

    const parsedAmount = parseFloat(newPledgeAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive amount for the pledge.");
      return;
    }

    const { error: insertError } = await supabase
      .from('project_pledges')
      .insert({
        member_id: newPledgeMember,
        project_id: projectId,
        amount: parsedAmount,
        paid_amount: 0, // New pledges start with 0 paid_amount
        due_date: newPledgeDueDate.toISOString(),
        status: "Active",
      });

    if (insertError) {
      console.error("Error adding new pledge:", insertError);
      showError(`Failed to add new pledge: ${insertError.message}`);
    } else {
      showSuccess("New pledge added successfully!");
      setNewPledgeAmount("");
      setNewPledgeDueDate(new Date());
      fetchPledges(); // Re-fetch pledges to update the list
      onPledgesUpdated(); // Notify parent component (Projects.tsx) to re-fetch its data
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const [editingPledge, setEditingPledge] = React.useState<ProjectPledge | null>(null);
  const [markAsPaidPledge, setMarkAsPaidPledge] = React.useState<ProjectPledge | null>(null);

  const handleEditPledge = (pledge: ProjectPledge) => {
    // This would typically open an EditPledgeDialog
    console.log("Editing pledge:", pledge.id);
    showError("Edit functionality for pledges within this dialog is not yet implemented.");
    // For now, we'll just set it to null to close any potential dialog
    // setEditingPledge(pledge);
  };

  const handleDeletePledge = async (pledgeId: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to delete pledges.");
      return;
    }

    const pledgeToDelete = pledges.find(p => p.id === pledgeId);
    if (!pledgeToDelete) {
      showError("Pledge not found.");
      return;
    }

    if (pledgeToDelete.paid_amount > 0) {
      const { error: rpcError } = await supabase.rpc('reverse_paid_pledge_atomic', {
        p_pledge_id: pledgeId,
        p_profile_id: currentUser.id,
      });

      if (rpcError) {
        console.error("Error reversing paid pledge:", rpcError);
        showError(`Failed to delete paid pledge: ${rpcError.message}`);
        return;
      }
    } else {
      const { error: deleteError } = await supabase
        .from('project_pledges')
        .delete()
        .eq('id', pledgeId);

      if (deleteError) {
        console.error("Error deleting pledge:", deleteError);
        showError("Failed to delete pledge.");
        return;
      }
    }

    showSuccess("Pledge deleted successfully!");
    fetchPledges();
    onPledgesUpdated();
    invalidateDashboardQueries();
  };

  if (loadingPledges || loadingMembers || loadingAccounts) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canManagePledges}>
            <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
            <DialogDescription>
              View, add, and manage financial pledges for this project.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">Loading pledges and accounts...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canManagePledges}>
            <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
            <DialogDescription>
              View, add, and manage financial pledges for this project.
            </DialogDescription>
          </DialogHeader>
          <p className="text-destructive">Error: {error}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManagePledges}>
          <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
          <DialogDescription>
            View, add, and manage financial pledges for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* New Pledge Form */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Add New Pledge</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="new-pledge-member">Member</Label>
                <Select value={newPledgeMember} onValueChange={setNewPledgeMember} disabled={!canManagePledges || members.length === 0}>
                  <SelectTrigger id="new-pledge-member">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Members</SelectLabel>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {members.length === 0 && <p className="text-sm text-destructive">No members found. Please add one in Admin Settings.</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-pledge-amount">Amount</Label>
                <Input
                  id="new-pledge-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPledgeAmount}
                  onChange={(e) => setNewPledgeAmount(e.target.value)}
                  disabled={!canManagePledges}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-pledge-due-date">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPledgeDueDate && "text-muted-foreground"
                      )}
                      disabled={!canManagePledges}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPledgeDueDate ? format(newPledgeDueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newPledgeDueDate}
                      onSelect={setNewPledgeDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button onClick={handleAddPledge} disabled={!canManagePledges || !newPledgeAmount || !newPledgeMember || !newPledgeDueDate || members.length === 0}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Pledge
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Pledges Table */}
          <h3 className="text-lg font-semibold mb-2">Existing Pledges</h3>
          {pledges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Pledged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pledges.map((pledge) => {
                  const displayStatus = getDisplayPledgeStatus(pledge);
                  const remainingAmount = pledge.original_amount - pledge.paid_amount;
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell>{pledge.member_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{pledge.original_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{pledge.paid_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{remainingAmount.toFixed(2)}</TableCell>
                      <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(displayStatus)}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      {canManagePledges && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            {remainingAmount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMarkAsPaidPledge(pledge)}
                                disabled={!canManagePledges}
                              >
                                Pay
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePledge(pledge.id)}
                              disabled={!canManagePledges}
                            >
                              Delete
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
            <p className="text-muted-foreground text-center">No pledges found for this project.</p>
          )}
        </div>
      </DialogContent>

      {markAsPaidPledge && (
        <MarkPledgeAsPaidDialog
          isOpen={!!markAsPaidPledge}
          setIsOpen={() => setMarkAsPaidPledge(null)}
          pledge={markAsPaidPledge}
          onMarkAsPaid={handleMarkPledgeAsPaid}
          financialAccounts={financialAccounts}
          currency={currency}
        />
      )}
    </Dialog>
  );
};

export default ProjectPledgesDialog;