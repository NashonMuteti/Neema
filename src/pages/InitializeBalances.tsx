"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InitializeBalancesDialog from "@/components/admin/InitializeBalancesDialog"; // Import the new dialog
import { showSuccess, showError } from "@/utils/toast";

const InitializeBalances = () => {
  const handleInitialize = (balances: Record<string, number>) => {
    // In a real application, this would trigger a backend process
    // to reset or set default values for all account balances.
    console.log("Initializing all account balances with:", balances);
    showSuccess("Account balances initialization initiated.");
    // Simulate a potential error
    // showError("Failed to initialize balances. Please try again.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Initialize Account Balances</h1>
      <p className="text-lg text-muted-foreground">
        Use this feature to reset or set default values for all financial accounts in the system.
        This action is typically performed when starting fresh or during major financial resets.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Account Balance Initialization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive">
            <span className="font-bold">Warning:</span> This is a critical operation and cannot be easily undone.
            Ensure you have backed up any necessary data before proceeding.
          </p>
          <InitializeBalancesDialog onInitialize={handleInitialize} /> {/* Use the new dialog */}
        </CardContent>
      </Card>
    </div>
  );
};

export default InitializeBalances;