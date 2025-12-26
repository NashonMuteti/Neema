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

interface ProjectPledge {
  id: string;
  member_id: string;
  project_id: string; // Added project_id
  member_name: string;
  amount: number;
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

interface Member {
  id: string;
  name: string;
  email: string;
}

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface PledgeRowWithProfile {
  id: string;
  member_id: string;
  amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string } | null;
  comments?: string; // Added comments
}

const getDisplayPledgeStatus = (pledge: ProjectPledge): "Paid" | "Unpaid" => {
  if (pledge.status === "Paid") return "Paid";
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
        amount: p.amount,
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
        .select('id, name, current_balance')
        .eq('profile_id', currentUser.id)
        .order('name', { ascending: true });

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        showError("Failed to load financial accounts for pledges.");
      } else {
        setFinancialAccounts(accountsData || []);
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

  const handleMarkPledgeAsPaid = async (pledgeId: string, receivedIntoAccountId: string, paymentMethod: string) => {
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

    const { error: transactionError } = await supabase.rpc('transfer_funds_atomic', {
      p_source_account_id: null,
      p_destination_account_id: receivedIntoAccountId,
      p_amount: pledgeToMark.amount,
      p_profile_id: currentUser.id,
      p_purpose: `Pledge Payment for Project: ${projectName}`,
      p_source: `Pledge Payment from Member: ${pledgeToMark.member_name}`,
      p_is_transfer: false,
      p_project_id: projectId,
      p_member_id: pledgeToMark.member_id,
      p_payment_method: paymentMethod,
      p_pledge_id: pledgeId,
    });

    if (transactionError) {
      console.error("Error marking pledge as paid and updating balance:", transactionError);
      showError(`Failed to update pledge: ${transactionError.message}`);
    } else {
      showSuccess("Pledge marked as paid and account balance updated successfully!");
      fetchPledges();
      onPledgesUpdated();
    }
  };

  const handleAddPledge = async () => {
    if (!newPledgeAmount || !newPledgeMember || !newPledgeDueDate) {
      showError("All new pledge fields are required.");
      return;
    }

    const parsedAmount = parseFloat(newPledgeAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive amount for the pledge.");
      return;
    }

    const { error } = await supabase
      .from('project_pledges')
      .insert({
        project_id: projectId,
        member_id: newPledgeMember,
        amount: parsedAmount,
        due_date: newPledgeDueDate.toISOString(),
        status: "Active",
      });

    if (error) {
      console.error("Error adding new pledge:", error);
      showError("Failed to add new pledge.");
    } else {
      showSuccess("New pledge added successfully!");
      fetchPledges();
      onPledgesUpdated();
      setNewPledgeAmount("");
      setNewPledgeMember(members.length > 0 ? members[0].id : undefined);
      setNewPledgeDueDate(new Date());
    }
  };

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
            View, add, and update the status of financial pledges for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="border p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Pledge
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="new-pledge-member">Member</Label>
                <Select value={newPledgeMember} onValueChange={setNewPledgeMember} disabled={!canManagePledges || loadingMembers}>
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
                {loadingMembers && <p className="text-sm text-muted-foreground">Loading members...</p>}
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
            </div>
            <Button onClick={handleAddPledge} className="w-full" disabled={!canManagePledges || !newPledgeAmount || !newPledgeMember || !newPledgeDueDate}>
              Add Pledge
            </Button>
          </div>

          <h3 className="text-lg font-semibold">Existing Pledges</h3>
          {loadingPledges ? (
            <p className="text-muted-foreground">Loading pledges...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : pledges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pledges.map((pledge) => {
                  const displayStatus = getDisplayPledgeStatus(pledge);
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell className="font-medium">{pledge.member_name}</TableCell>
                      <TableCell>{currency.symbol}{pledge.amount.toFixed(2)}</TableCell>
                      <TableCell>{format(pledge.due_date, "PPP")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(displayStatus)}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      {canManagePledges && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            {displayStatus !== "Paid" && (
                              <MarkPledgeAsPaidDialog
                                pledge={pledge}
                                onConfirmPayment={handleMarkPledgeAsPaid}
                                financialAccounts={financialAccounts}
                                canManagePledges={canManagePledges}
                              />
                            )}
                            {/* Removed "Mark as Overdue" button */}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No pledges found for this project.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPledgesDialog;