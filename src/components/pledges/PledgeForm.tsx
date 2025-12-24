"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { CalendarIcon, PlusCircle } from "lucide-react";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface Member {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface PledgeFormProps {
  members: Member[];
  projects: Project[];
  onRecordPledge: (pledgeData: {
    member_id: string;
    project_id: string;
    amount: number;
    due_date: Date;
  }) => void;
  canManagePledges: boolean;
}

const PledgeForm: React.FC<PledgeFormProps> = ({
  members,
  projects,
  onRecordPledge,
  canManagePledges,
}) => {
  const { currency } = useSystemSettings();

  const [newPledgeMemberId, setNewPledgeMemberId] = React.useState<string | undefined>(undefined);
  const [newPledgeProjectId, setNewPledgeProjectId] = React.useState<string | undefined>(undefined);
  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(new Date());

  React.useEffect(() => {
    if (members.length > 0 && !newPledgeMemberId) {
      setNewPledgeMemberId(members[0].id);
    }
    if (projects.length > 0 && !newPledgeProjectId) {
      setNewPledgeProjectId(projects[0].id);
    }
  }, [members, projects, newPledgeMemberId, newPledgeProjectId]);

  const handleSubmit = () => {
    if (!newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const amount = parseFloat(newPledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    onRecordPledge({
      member_id: newPledgeMemberId,
      project_id: newPledgeProjectId,
      amount,
      due_date: newPledgeDueDate,
    });

    // Reset form
    setNewPledgeAmount("");
    setNewPledgeDueDate(new Date());
    setNewPledgeMemberId(members.length > 0 ? members[0].id : undefined);
    setNewPledgeProjectId(projects.length > 0 ? projects[0].id : undefined);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Record New Pledge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pledge-member">Member</Label>
          <Select value={newPledgeMemberId} onValueChange={setNewPledgeMemberId} disabled={!canManagePledges || members.length === 0}>
            <SelectTrigger id="pledge-member">
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Members</SelectLabel>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {members.length === 0 && <p className="text-sm text-muted-foreground">No members available. Add members first.</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pledge-project">Project</Label>
          <Select value={newPledgeProjectId} onValueChange={setNewPledgeProjectId} disabled={!canManagePledges || projects.length === 0}>
            <SelectTrigger id="pledge-project">
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
          {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects available. Add projects first.</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pledge-amount">Amount</Label>
          <Input
            id="pledge-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newPledgeAmount}
            onChange={(e) => setNewPledgeAmount(e.target.value)}
            disabled={!canManagePledges}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pledge-due-date">Due Date</Label>
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

        <Button onClick={handleSubmit} className="w-full" disabled={!canManagePledges || !newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate}>
          Record Pledge
        </Button>
      </CardContent>
    </Card>
  );
};

export default PledgeForm;