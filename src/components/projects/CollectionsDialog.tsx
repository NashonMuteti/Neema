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
import { CalendarIcon, PlusCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";

interface CollectionsDialogProps {
  projectId: string;
  projectName: string;
  onCollectionAdded: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "online-payment", label: "Online Payment" },
  { value: "mobile-money", label: "Mobile Money" },
];

const CollectionsDialog: React.FC<CollectionsDialogProps> = ({
  projectId,
  projectName,
  onCollectionAdded,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageProjects } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageProjects: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageProjects = currentUserPrivileges.includes("Manage Projects");
    return { canManageProjects };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [collectionDate, setCollectionDate] = React.useState<Date | undefined>(new Date());
  const [amount, setAmount] = React.useState("");
  const [selectedMember, setSelectedMember] = React.useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(undefined);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);

  React.useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching members:", error);
        showError("Failed to load members for collection.");
      } else {
        setMembers(data || []);
        if (data && data.length > 0 && !selectedMember) {
          setSelectedMember(data[0].id); // Default to first member
        }
      }
      setLoadingMembers(false);
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, selectedMember]);

  const handleSubmit = async () => {
    if (!collectionDate || !amount || !selectedMember || !paymentMethod) {
      showError("All fields are required.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive amount.");
      return;
    }

    const { error } = await supabase
      .from('project_collections')
      .insert({
        project_id: projectId,
        member_id: selectedMember,
        amount: parsedAmount,
        date: collectionDate.toISOString(),
        payment_method: paymentMethod,
      });

    if (error) {
      console.error("Error adding collection:", error);
      showError("Failed to add collection.");
    } else {
      showSuccess("Collection added successfully!");
      onCollectionAdded();
      setIsOpen(false);
      // Reset form
      setCollectionDate(new Date());
      setAmount("");
      setSelectedMember(members.length > 0 ? members[0].id : undefined);
      setPaymentMethod(undefined);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageProjects}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Collection for {projectName}</DialogTitle>
          <DialogDescription>
            Record a financial contribution made to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="collection-date">Date of Collection</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !collectionDate && "text-muted-foreground"
                  )}
                  disabled={!canManageProjects}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {collectionDate ? format(collectionDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={collectionDate}
                  onSelect={setCollectionDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="collection-amount">Amount</Label>
            <Input
              id="collection-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canManageProjects}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="collection-member">Collected From Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember} disabled={!canManageProjects || loadingMembers}>
              <SelectTrigger id="collection-member">
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
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!canManageProjects}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Methods</SelectLabel>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageProjects || !collectionDate || !amount || !selectedMember || !paymentMethod}>
            Add Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionsDialog;