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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

interface Account {
  id: string;
  name: string;
  currentBalance: number;
}

interface InitializeBalancesDialogProps {
  onInitialize: (balances: Record<string, number>) => void;
}

const dummyAccounts: Account[] = [
  { id: "acc1", name: "Cash at Hand", currentBalance: 1500.00 },
  { id: "acc2", name: "Petty Cash", currentBalance: 300.00 },
  { id: "acc3", name: "Bank Mpesa Account", currentBalance: 12500.00 },
  { id: "acc4", name: "Main Bank Account", currentBalance: 50000.00 },
];

const InitializeBalancesDialog: React.FC<InitializeBalancesDialogProps> = ({ onInitialize }) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canInitializeBalances } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canInitializeBalances: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canInitializeBalances = currentUserPrivileges.includes("Initialize Balances");
    return { canInitializeBalances };
  }, [currentUser, definedRoles]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [newBalances, setNewBalances] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      // Initialize with current balances or zeros
      const initialBalances: Record<string, string> = {};
      dummyAccounts.forEach(acc => {
        initialBalances[acc.id] = acc.currentBalance.toFixed(2);
      });
      setNewBalances(initialBalances);
    }
  }, [isOpen]);

  const handleBalanceChange = (accountId: string, value: string) => {
    setNewBalances((prev) => ({ ...prev, [accountId]: value }));
  };

  const handleSubmit = () => {
    const parsedBalances: Record<string, number> = {};
    let isValid = true;
    for (const accountId in newBalances) {
      const value = parseFloat(newBalances[accountId]);
      if (isNaN(value) || value < 0) {
        showError(`Invalid balance for ${dummyAccounts.find(a => a.id === accountId)?.name || accountId}. Please enter a non-negative number.`);
        isValid = false;
        break;
      }
      parsedBalances[accountId] = value;
    }

    if (!isValid) return;

    onInitialize(parsedBalances);
    showSuccess("Account balances initialized successfully!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={!canInitializeBalances}>Initialize All Balances</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initialize Account Balances</DialogTitle>
          <DialogDescription>
            Set the starting balances for your money-holding accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Enter the desired starting balance for each account.
          </p>
          {dummyAccounts.map((account) => (
            <div key={account.id} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`balance-${account.id}`} className="col-span-1">
                {account.name}
              </Label>
              <Input
                id={`balance-${account.id}`}
                type="number"
                step="0.01"
                value={newBalances[account.id] || ""}
                onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                className="col-span-2"
                placeholder="0.00"
                disabled={!canInitializeBalances}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canInitializeBalances}>Confirm Initialization</Button>
        </div>
        <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive mt-2">
          <span className="font-bold">Warning:</span> This action will overwrite existing balances.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default InitializeBalancesDialog;