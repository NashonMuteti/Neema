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
import { format } from "date-fns";
import { CalendarIcon, Save, Edit } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Member, FinancialAccount } from "@/types/common"; // Updated import

interface Project {
  id: string;
  name: string;
}

export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid"; // Changed: Removed "Overdue"
  comments?: string;
}

interface EditPledgeDialogProps {
  initialData: Pledge;
  onSave: (updatedPledge: Pledge) => void;
  members: Member[];
  projects: Project[];
  financialAccounts: FinancialAccount[]; // New prop
}

const EditPledgeDialog: React.FC<EditPledgeDialogProps> = ({
  initialData,
  onSave,
  members,
  projects,
  financialAccounts, // Destructure new prop
}) => {
  const { currency } = useSystemSettings();
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
  const [memberId, setMemberId] = React.useState(initialData.member_id);
  const [projectId, setProjectId] = React.useState(initialData.project_id);
  const [originalAmount, setOriginalAmount] = React.useState(initialData.original_amount.toString()); // Now original_amount
  const [dueDate, setDueDate] = React.useState<Date | undefined>(initialData.due_date);
  const [comments, setComments] = React.useState(initialData.comments || "");
  const [status, setStatus] = React.useState<"Active" | "Paid">(initialData.status); // Status is derived from paid_amount
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMemberId(initialData.member_id);
      setProjectId(initialData.project_id);
      setOriginalAmount(initialData.original_amount.toString());
      setDueDate(initialData.due_date);
      setComments(initialData.comments || "");
      // Status is derived, but we can set it for initial display if needed
      setStatus(initialData.paid_amount >= initialData.original_amount ? "Paid" : "Active");
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!memberId || !projectId || !originalAmount || !dueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const parsedOriginalAmount = parseFloat(originalAmount);
    if (isNaN(parsedOriginalAmount) || parsedOriginalAmount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    // Validation: Ensure original_amount is not reduced below paid_amount
    if (parsedOriginalAmount < initialData.paid_amount) {
      showError(`Original amount cannot be less than the amount already paid (${currency.symbol}${initialData.paid_amount.toFixed(2)}).`);
      return;
    }

    setIsSaving(true);
    
    const newStatus = parsedOriginalAmount <= initialData.paid_amount ? "Paid" : "Active";

    const updatedPledgeData = {
      member_id: memberId,
      project_id: projectId,
      amount: parsedOriginalAmount, // Update the 'amount' column (which is now original_amount)
      paid_amount: initialData.paid_amount, // paid_amount is not edited here
      due_date: dueDate.toISOString(),
      status: newStatus,
      comments: comments.trim() || null,
    };

    const { error } = await supabase
      .from('project_pledges')
      .update(updatedPledgeData)
      .eq('id', initialData.id);

    if (error) {
      console.error("Error updating pledge:", error);
      showError("Failed to update pledge.");
      setIsSaving(false);
      return;
    }

    showSuccess("Pledge updated successfully!");
    onSave({ ...initialData, member_id: memberId, project_id: projectId, original_amount: parsedOriginalAmount, due_date: dueDate, status: newStatus, comments: comments.trim() || undefined });
    setIsOpen(false);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit Pledge" disabled={!canManagePledges}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pledge</DialogTitle>
          <DialogDescription>
            Make changes to the pledge details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!canManagePledges || members.length === 0 || isSaving}>
              <SelectTrigger id="edit-pledge-dialog-member">
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
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members available.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!canManagePledges || projects.length === 0 || isSaving}>
              <SelectTrigger id="edit-pledge-dialog-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Projects</SelectLabel>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects available.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-original-amount">Original Pledged Amount</Label>
            <Input
              id="edit-pledge-dialog-original-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              disabled={!canManagePledges || isSaving}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-paid-amount">Amount Paid</Label>
            <Input
              id="edit-pledge-dialog-paid-amount"
              type="number"
              value={initialData.paid_amount.toFixed(2)}
              disabled // This field is not editable directly
            />
            <p className="text-sm text-muted-foreground">Amount paid can only be updated by recording a payment.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-due-date">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  id="edit-pledge-dialog-due-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={!canManagePledges || isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-status">Status</Label>
            <Input
              id="edit-pledge-dialog-status"
              value={initialData.paid_amount >= initialData.original_amount ? "Paid" : "Active"}
              disabled // Status is derived, not directly editable
            />
            <p className="text-sm text-muted-foreground">Status is automatically updated based on payments.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-dialog-comments">Comments (Optional)</Label>
            <Textarea
              id="edit-pledge-dialog-comments"
              placeholder="Add any relevant comments about this pledge..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={!canManagePledges || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManagePledges || isSaving || parseFloat(originalAmount) < initialData.paid_amount}>
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPledgeDialog;