"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Debts = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Debts Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage outstanding debts and payment tracking.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Outstanding Debts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will list all outstanding debts, track payment schedules, and allow for recording debt repayments.
            Reminders and overdue notifications can be managed here.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            (Placeholder content for future implementation)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debts;