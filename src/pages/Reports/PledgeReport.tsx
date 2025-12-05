"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast"; // Assuming you have a toast utility

const dummyPledges = [
  {
    id: "p1",
    member: "Alice Johnson",
    project: "Film Production X",
    amount: 500.00,
    status: "Active",
  },
  {
    id: "p2",
    member: "Bob Williams",
    project: "Marketing Campaign Y",
    amount: 250.00,
    status: "Active",
  },
  {
    id: "p3",
    member: "Charlie Brown",
    project: "Film Production X",
    amount: 750.00,
    status: "Active",
  },
  {
    id: "p4",
    member: "Alice Johnson",
    project: "Post-Production Z",
    amount: 100.00,
    status: "Active",
  },
];

const PledgeReport = () => {
  const handlePay = (pledgeId: string, memberName: string, amount: number) => {
    // In a real application, this would trigger a payment process
    showSuccess(`Payment initiated for ${memberName}'s pledge of $${amount.toFixed(2)}.`);
    console.log(`Initiating payment for pledge ID: ${pledgeId}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Pledge Report</h1>
      <p className="text-lg text-muted-foreground">
        View active pledges from members across all projects and process payments.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Active Pledges</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyPledges.map((pledge) => (
              <TableRow key={pledge.id}>
                <TableCell className="font-medium">{pledge.member}</TableCell>
                <TableCell>{pledge.project}</TableCell>
                <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                <TableCell className="text-center">{pledge.status}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePay(pledge.id, pledge.member, pledge.amount)}
                  >
                    Pay
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PledgeReport;