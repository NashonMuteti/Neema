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
import { Member } from "@/types/common";

interface ProjectPledgeFormProps {
  members: Member[];
  onAddPledge: (pledgeData: {
    member_id: string;
    amount: number;
    due_date: Date;
  }) => Promise<void>;
  canManagePledges: boolean;
  isProcessing: boolean;
}

const ProjectPledgeForm: React.FC<ProjectPledgeFormProps> = ({
  members,
  onAddPledge,
  canManagePledges,
  isProcessing,
}) => {
  const { currency } = useSystemSettings();

  const [newPledgeMemberId, setNewPledgeMemberId] = React.useState<string | undefined>(undefined);
  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(new Date());

  React.useEffect(() => {
    if (members.length > 0 && !newPledgeMemberId) {
      setNewPledgeMemberId(members[0].id);
    }
  }, [members, newPledgeMemberId]);

  const handleSubmit = async () => {
    if (!newPledgeMemberId || !newPledgeAmount || !newPledgeDueDate) {
      showError("All new pledge fields are required.");
      return;
    }
    const amount = parseFloat(newPledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive amount for the pledge.");
      return;
    }

    await onAddPledge({
      member_id: newPledgeMemberId,
      amount,
      due_date: newPledgeDueDate,
    });

    // Reset form
    setNewPledgeAmount("");
    setNewPledgeDueDate(new Date());
    setNewPledgeMemberId(members.length > 0 ? members[0].id : undefined);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Add New Pledge</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="new-pledge-member">Member</Label>
          <Select value={newPledgeMemberId} onValueChange={setNewPledgeMemberId} disabled={!canManagePledges || members.length === 0 || isProcessing}>
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
            disabled={!canManagePledges || isProcessing}
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
                disabled={!canManagePledges || isProcessing}
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
          <Button onClick={handleSubmit} disabled={!canManagePledges || !newPledgeAmount || !newPledgeMemberId || !newPledgeDueDate || members.length === 0 || isProcessing}>
            {isProcessing ? "Adding..." : <><PlusCircle className="mr-2 h-4 w-4" /> Add Pledge</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectPledgeForm;