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

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
}

interface EditPledgeDialogProps {
  initialData: Pledge;
  onSave: (updatedPledge: Pledge) => void;
  members: Member[];
  projects: Project[];
}

const EditPledgeDialog: React.FC<EditPledgeDialogProps> = ({
  initialData,
  onSave,
  members,
  projects,
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
  const [amount, setAmount] = React.useState(initialData.amount.toString());
  const [dueDate, setDueDate] = React.useState<Date | undefined>(initialData.due_date);
  const [comments, setComments] = React.useState(initialData.comments || "");
  const [status, setStatus] = React.useState<"Active" | "Paid" | "Overdue">(initialData.status);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMemberId(initialData.member_id);
      setProjectId(initialData.project_id);
      setAmount(initialData.amount.toString());
      setDueDate(initialData.due_date);
      setComments(initialData.comments || "");
      setStatus(initialData.status);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!memberId || !projectId || !amount || !dueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    setIsSaving(true);
    const updatedPledgeData = {
      member_id: memberId,
      project_id: projectId,
      amount: parsedAmount,
      due_date: dueDate.toISOString(),
      status: status,
      comments: comments.trim() || null,
    };

    const { error } = await supabase
      .from('project_pledges')
      .update(updatedPledgeData)
      .eq('id', initialData.id);

    if (error) {
      console.error("Error updating pledge:", error);
      showError("Failed to update pledge.");
    } else {
      showSuccess("Pledge updated successfully!");
      onSave({ ...initialData, ...updatedPledgeData, due_date: dueDate });
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={!canManagePledges}>
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
            <Label htmlFor="edit-pledge-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!canManagePledges || members.length === 0 || isSaving}>
              <SelectTrigger id="edit-pledge-member">
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
            <Label htmlFor="edit-pledge-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!canManagePledges || projects.length === 0 || isSaving}>
              <SelectTrigger id="edit-pledge-project">
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
            <Label htmlFor="edit-pledge-amount">Amount</Label>
            <Input
              id="edit-pledge-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canManagePledges || isSaving}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-due-date">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
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
            <Label htmlFor="edit-pledge-status">Status</Label>
            <Select value={status} onValueChange={(value: "Active" | "Paid" | "Overdue") => setStatus(value)} disabled={!canManagePledges || isSaving}>
              <SelectTrigger id="edit-pledge-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Pledge Status</SelectLabel>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-pledge-comments">Comments (Optional)</Label>
            <Textarea
              id="edit-pledge-comments"
              placeholder="Add any relevant comments about this pledge..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={!canManagePledges || isSaving}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManagePledges || isSaving}>
            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPledgeDialog;