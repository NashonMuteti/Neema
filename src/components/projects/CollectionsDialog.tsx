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
import { useQueryClient } from "@tanstack/react-query"; // New import

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
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient(); // Initialize queryClient

  const { canManageCollections } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageCollections: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageCollections = currentUserPrivileges.includes("Manage Collections");
    return { canManageCollections };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [memberId, setMemberId] = React.useState<string | undefined>(undefined);
  const [receivedIntoAccount, setReceivedIntoAccount] = React.useState<string | undefined>(undefined);
  const [collectionDate, setCollectionDate] = React.useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(undefined);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const fetchMembersAndAccounts = React.useCallback(async () => {
    setLoadingMembers(true);
    setLoadingAccounts(true);

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members for collections.");
    } else {
      setMembers(membersData || []);
      if (membersData && membersData.length > 0 && !memberId) {
        setMemberId(membersData[0].id);
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
        showError("Failed to load financial accounts for collections.");
      } else {
        setFinancialAccounts(accountsData || []);
        if (accountsData && accountsData.length > 0 && !receivedIntoAccount) {
          setReceivedIntoAccount(accountsData[0].id);
        }
      }
    }
    setLoadingAccounts(false);
  }, [memberId, receivedIntoAccount, currentUser]);

  React.useEffect(() => {
    if (isOpen) {
      fetchMembersAndAccounts();
      setAmount("");
      setCollectionDate(new Date());
      setPaymentMethod(paymentMethods[0]?.value); // Default to first payment method
      setIsProcessing(false);
    }
  }, [isOpen, fetchMembersAndAccounts]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
  };

  const handleAddCollection = async () => {
    if (!amount || !memberId || !receivedIntoAccount || !collectionDate || !paymentMethod) {
      showError("All collection fields are required.");
      return;
    }
    if (!currentUser) {
      showError("User not logged in to perform this action.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError("Please enter a valid positive amount.");
      return;
    }

    setIsProcessing(true);

    const { error: rpcError } = await supabase.rpc('transfer_funds_atomic', {
      p_source_account_id: null, // No source account for a collection
      p_destination_account_id: receivedIntoAccount,
      p_amount: parsedAmount,
      p_actor_profile_id: currentUser.id,
      p_purpose: `Project Collection for ${projectName}`,
      p_source: `Project Collection: ${projectName}`,
      p_is_transfer: false,
      p_project_id: projectId,
      p_member_id: memberId,
      p_payment_method: paymentMethod,
      p_pledge_id: null, // This is not a pledge payment
      p_transaction_profile_id: memberId, // Associate transaction with the member who made the collection
    });

    if (rpcError) {
      console.error("Error adding collection:", rpcError);
      showError(`Failed to add collection: ${rpcError.message}`);
    } else {
      showSuccess("Collection added successfully!");
      onCollectionAdded();
      invalidateDashboardQueries(); // Invalidate dashboard queries
      setIsOpen(false);
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageCollections}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Collection for {projectName}</DialogTitle>
          <DialogDescription>
            Record a new financial collection for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="collection-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!canManageCollections || loadingMembers || isProcessing}>
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
            {members.length === 0 && !loadingMembers && <p className="text-sm text-destructive">No members found. Please add one in Admin Settings.</p>}
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
              disabled={!canManageCollections || isProcessing}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="collection-date">Collection Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !collectionDate && "text-muted-foreground"
                  )}
                  disabled={!canManageCollections || isProcessing}
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
            <Label htmlFor="received-into-account">Received Into Account</Label>
            <Select
              value={receivedIntoAccount}
              onValueChange={setReceivedIntoAccount}
              disabled={!canManageCollections || financialAccounts.length === 0 || isProcessing}
            >
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
            {financialAccounts.length === 0 && !loadingAccounts && <p className="text-sm text-destructive">No financial accounts found. Please add one in Admin Settings.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!canManageCollections || isProcessing}>
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
          <Button
            onClick={handleAddCollection}
            disabled={!canManageCollections || !amount || !memberId || !receivedIntoAccount || !collectionDate || !paymentMethod || isProcessing || members.length === 0 || financialAccounts.length === 0}
          >
            {isProcessing ? "Adding..." : <><PlusCircle className="mr-2 h-4 w-4" /> Add Collection</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionsDialog;