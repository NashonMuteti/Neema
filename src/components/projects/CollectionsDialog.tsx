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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useQueryClient } from "@tanstack/react-query";
import { FinancialAccount, Member } from "@/types/common";
import BulkCollectionsPanel from "@/components/projects/BulkCollectionsPanel";

interface CollectionsDialogProps {
  projectId: string;
  projectName: string;
  onCollectionAdded: () => void;
}

const CollectionsDialog: React.FC<CollectionsDialogProps> = ({
  projectId,
  projectName,
  onCollectionAdded,
}) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const { canManageCollections } = React.useMemo(() => {
    if (!currentUser) {
      return { canManageCollections: false };
    }

    if (currentUser.role === "Super Admin") {
      return { canManageCollections: true };
    }

    if (!definedRoles) {
      return { canManageCollections: false };
    }
    const currentUserRoleDefinition = definedRoles.find((role) => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageCollections = currentUserPrivileges.includes("Manage Collections");
    return { canManageCollections };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);

  // Single entry state
  const [amount, setAmount] = React.useState("");
  const [memberId, setMemberId] = React.useState<string | undefined>(undefined);
  const [receivedIntoAccount, setReceivedIntoAccount] = React.useState<string | undefined>(undefined);
  const [collectionDate, setCollectionDate] = React.useState<Date | undefined>(new Date());

  // Shared data
  const [members, setMembers] = React.useState<Member[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const receivableAccounts = React.useMemo(() => {
    return financialAccounts.filter((account) => account.can_receive_payments);
  }, [financialAccounts]);

  const fetchMembersAndAccounts = React.useCallback(async () => {
    setLoadingMembers(true);
    setLoadingAccounts(true);

    const { data: membersData, error: membersError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("status", "Active")
      .order("name", { ascending: true });

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
        .from("financial_accounts")
        .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
        .eq("profile_id", currentUser.id)
        .order("name", { ascending: true });

      if (accountsError) {
        console.error("Error fetching financial accounts:", accountsError);
        showError("Failed to load financial accounts for collections.");
      } else {
        setFinancialAccounts(accountsData || []);
        if (accountsData && accountsData.length > 0 && !receivedIntoAccount) {
          setReceivedIntoAccount(
            accountsData.find((acc) => acc.can_receive_payments)?.id || undefined,
          );
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
      setIsProcessing(false);
    }
  }, [isOpen, fetchMembersAndAccounts]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
    queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardProjects"] });
    queryClient.invalidateQueries({ queryKey: ["contributionsProgress"] });
  };

  const handleCollectionSaved = () => {
    onCollectionAdded();
    invalidateDashboardQueries();
    setIsOpen(false);
  };

  const handleAddCollection = async () => {
    if (!amount || !memberId || !receivedIntoAccount || !collectionDate) {
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

    const { error } = await supabase.rpc("record_project_collection_atomic", {
      p_destination_account_id: receivedIntoAccount,
      p_amount: parsedAmount,
      p_actor_profile_id: currentUser.id,
      p_project_id: projectId,
      p_member_id: memberId,
      p_collection_date: collectionDate.toISOString(),
      p_source: `Project Collection: ${projectName}`,
    });

    if (error) {
      console.error("Error adding collection:", error);
      showError(`Failed to add collection: ${error.message}`);
      setIsProcessing(false);
      return;
    }

    showSuccess("Collection added successfully!");
    handleCollectionSaved();
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManageCollections}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Collection
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Collections for {projectName}</DialogTitle>
          <DialogDescription>
            Record a new collection or do a bulk upload for this project.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="single">Single entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk update</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="collection-member">Member</Label>
                <Select
                  value={memberId}
                  onValueChange={setMemberId}
                  disabled={!canManageCollections || loadingMembers || isProcessing}
                >
                  <SelectTrigger id="collection-member">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Active Members</SelectLabel>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {loadingMembers ? (
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                ) : null}
                {members.length === 0 && !loadingMembers ? (
                  <p className="text-sm text-destructive">No active members found.</p>
                ) : null}
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
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !collectionDate && "text-muted-foreground",
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
                  disabled={!canManageCollections || receivableAccounts.length === 0 || isProcessing}
                >
                  <SelectTrigger id="received-into-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Receiving Accounts</SelectLabel>
                      {receivableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} (Balance: {currency.symbol}
                          {account.current_balance.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {receivableAccounts.length === 0 && !loadingAccounts ? (
                  <p className="text-sm text-destructive">
                    No financial accounts found that can receive payments.
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleAddCollection}
                  disabled={
                    !canManageCollections ||
                    !amount ||
                    !memberId ||
                    !receivedIntoAccount ||
                    !collectionDate ||
                    isProcessing ||
                    members.length === 0 ||
                    receivableAccounts.length === 0
                  }
                >
                  {isProcessing ? (
                    "Adding..."
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Collection
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            {currentUser ? (
              <BulkCollectionsPanel
                projectId={projectId}
                projectName={projectName}
                actorProfileId={currentUser.id}
                members={members}
                receivableAccounts={receivableAccounts}
                defaultAccountId={receivedIntoAccount}
                disabled={!canManageCollections || isProcessing || loadingMembers || loadingAccounts}
                onComplete={() => {
                  handleCollectionSaved();
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Please log in to use bulk upload.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionsDialog;