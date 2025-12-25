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
import { Edit, CheckCircle, XCircle, PlusCircle } from "lucide-react";
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

interface ProjectPledge {
  id: string;
  member_id: string;
  member_name: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid"; // Changed: Removed "Overdue"
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

// Define the expected structure of a pledge row with joined profile data
interface PledgeRowWithProfile {
  id: string;
  member_id: string;
  amount: number;
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue"; // Keep "Overdue" for fetching, but map to "Active"
  profiles: { name: string } | null; // Joined profile data
}

// Helper to determine display status
const getDisplayPledgeStatus = (pledge: ProjectPledge): "Paid" | "Unpaid" => {
  if (pledge.status === "Paid") return "Paid";
  return "Unpaid"; // Active is now considered Unpaid
};

const ProjectPledgesDialog: React.FC<ProjectPledgesDialogProps> = ({
  projectId,
  projectName,
  onPledgesUpdated,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

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

  // New Pledge Form State
  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeMember, setNewPledgeMember] = React.useState<string | undefined>(undefined);
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(new Date());
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);

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
        member_name: p.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
        amount: p.amount,
        due_date: parseISO(p.due_date),
        status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid", // Map "Overdue" to "Active"
      })));
    }
    setLoadingPledges(false);
  }, [projectId]);

  const fetchMembers = React.useCallback(async () => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      showError("Failed to load members for pledges.");
    } else {
      setMembers(data || []);
      if (data && data.length > 0 && !newPledgeMember) {
        setNewPledgeMember(data[0].id); // Default to first member
      }
    }
    setLoadingMembers(false);
  }, [newPledgeMember]);

  React.useEffect(() => {
    if (isOpen) {
      fetchPledges();
      fetchMembers();
    }
  }, [isOpen, fetchPledges, fetchMembers]);

  const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid") => {
    switch (displayStatus) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Unpaid":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; // Active/Overdue now red for Unpaid
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const handleUpdatePledgeStatus = async (pledgeId: string, newStatus: ProjectPledge['status']) => {
    if (!canManagePledges) {
      showError("You do not have permission to update pledge status.");
      return;
    }

    const { error } = await supabase
      .from('project_pledges')
      .update({ status: newStatus })
      .eq('id', pledgeId);

    if (error) {
      console.error("Error updating pledge status:", error);
      showError("Failed to update pledge status.");
    } else {
      showSuccess("Pledge status updated successfully!");
      fetchPledges();
      onPledgesUpdated(); // Notify parent to refresh financials
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
        status: "Active", // New pledges are active by default
      });

    if (error) {
      console.error("Error adding new pledge:", error);
      showError("Failed to add new pledge.");
    } else {
      showSuccess("New pledge added successfully!");
      fetchPledges();
      onPledgesUpdated(); // Notify parent to refresh financials
      // Reset form
      setNewPledgeAmount("");
      setNewPledgeMember(members.length > 0 ? members[0].id : undefined);
      setNewPledgeDueDate(new Date());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
          <DialogDescription>
            View, add, and update the status of financial pledges for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Add New Pledge Section */}
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

          {/* Existing Pledges Table */}
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
                      <TableCell>${pledge.amount.toFixed(2)}</TableCell>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdatePledgeStatus(pledge.id, "Paid")}
                                title="Mark as Paid"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
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