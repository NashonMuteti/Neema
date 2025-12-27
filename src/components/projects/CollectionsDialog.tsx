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
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

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

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
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
  const { currency } = useSystemSettings(); // Use currency from context

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
  const [receivedIntoAccount, setReceivedIntoAccount] = React.useState<string | undefined>(undefined); // New state for financial account
  const [members, setMembers] = React.useState<Member[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]); // New state for financial accounts
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);

  React.useEffect(() => {
    const fetchMembersAndAccounts = async () => {
      setLoadingMembers(true);
      setLoadingAccounts(true);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (membersError) {
        console.error("Error fetching members:", membersError);
        showError("Failed to load members for collection.");
      } else {
        setMembers(membersData || []);
        if (membersData && membersData.length > 0 && !selectedMember) {
          setSelectedMember(membersData[0].id); // Default to first member
        }
      }
      setLoadingMembers(false);

      // Fetch financial accounts for the current user
      if (currentUser) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('financial_accounts')
          .select('id, name, current_balance')
          .eq('profile_id', currentUser.id)
          .order('name', { ascending: true });

        if (accountsError) {
          console.error("Error fetching financial accounts:", accountsError);
          showError("Failed to load financial accounts for collection.");
        } else {
          setFinancialAccounts(accountsData || []);
          if (accountsData && accountsData.length > 0 && !receivedIntoAccount) {
            setReceivedIntoAccount(accountsData[0].id); // Default to first account
          }
        }
      }
      setLoadingAccounts(false);
    };

    if (isOpen) {
      fetchMembersAndAccounts();
    }
  }, [isOpen, selectedMember, receivedIntoAccount, currentUser]);

  const handleSubmit = async () => {
    if (!collectionDate || !amount || !selectedMember || !paymentMethod || !receivedIntoAccount) {
      showError("All fields are required.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive amount.");
      return;
    }

    // Start a transaction for atomicity
    const { error: transactionError } = await supabase.rpc('transfer_funds_atomic', {
      p_source_account_id: null, // No source account for collections
      p_destination_account_id: receivedIntoAccount,
      p_amount: parsedAmount,
      p_actor_profile_id: currentUser?.id, // The user performing the action
      p_purpose: `Project Collection: ${projectName}`,
      p_source: `Project Collection: ${projectName}`,
      p_is_transfer: false, // Not a transfer, it's a direct income
      p_project_id: projectId,
      p_member_id: selectedMember,
      p_payment_method: paymentMethod,
      p_pledge_id: null,
      p_transaction_profile_id: selectedMember, // NEW: Associate income transaction with the contributing member
    });

    if (transactionError) {
      console.error("Error adding collection and updating balance:", transactionError);
      showError(`Failed to add collection: ${transactionError.message}`);
    } else {
      showSuccess("Collection added and account balance updated successfully!");
      onCollectionAdded();
      setIsOpen(false);
      // Reset form
      setCollectionDate(new Date());
      setAmount("");
      setSelectedMember(members.length > 0 ? members[0].id : undefined);
      setPaymentMethod(undefined);
      setReceivedIntoAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
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

          <div className="grid gap-1.5">
            <Label htmlFor="received-into-account">Received Into Account</Label>
            <Select value={receivedIntoAccount} onValueChange={setReceivedIntoAccount} disabled={!canManageProjects || loadingAccounts || financialAccounts.length === 0}>
              <SelectTrigger id="received-into-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Financial Accounts</SelectLabel>
                  {financialAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {loadingAccounts && <p className="text-sm text-muted-foreground">Loading accounts...</p>}
            {!loadingAccounts && financialAccounts.length === 0 && <p className="text-sm text-destructive">No financial accounts found. Please add one in Admin Settings.</p>}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canManageProjects || !collectionDate || !amount || !selectedMember || !paymentMethod || !receivedIntoAccount || financialAccounts.length === 0}>
            Add Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionsDialog;