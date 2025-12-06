"use client";

import React from "react";

// Dummy data for members (to get member name)
const dummyMembers = [
  { id: "m1", name: "Alice Johnson" },
  { id: "m2", name: "Bob Williams" },
  { id: "m3", name: "Charlie Brown" },
];

// Dummy data for project collections
const allProjectCollections = [
  { id: "col1", projectId: "proj1", memberId: "m1", amount: 50, date: "2024-07-10", paymentMethod: "cash" },
  { id: "col2", projectId: "proj1", memberId: "m3", amount: 25, date: "2024-07-12", paymentMethod: "bank-transfer" },
  { id: "col3", projectId: "proj5", memberId: "m1", amount: 20, date: "2024-07-15", paymentMethod: "cash" },
  { id: "col4", projectId: "proj2", memberId: "m2", amount: 50, date: "2024-08-01", paymentMethod: "online-payment" },
  { id: "col5", projectId: "proj1", memberId: "m1", amount: 50, date: "2024-08-05", paymentMethod: "cash" },
];

// Dummy data for project pledges
const allProjectPledges = [
  { id: "p1", projectId: "proj1", memberId: "m1", amount: 500, dueDate: "2024-07-15", status: "Active" },
  { id: "p2", projectId: "proj2", memberId: "m2", amount: 250, dueDate: "2024-05-01", status: "Overdue" },
  { id: "p3", projectId: "proj1", memberId: "m3", amount: 750, dueDate: "2024-08-10", status: "Active" },
  { id: "p4", projectId: "proj3", memberId: "m1", amount: 100, dueDate: "2024-04-20", status: "Paid" },
  { id: "p5", projectId: "proj5", memberId: "m2", amount: 150, dueDate: "2024-07-25", status: "Active" },
];

interface ProjectFinancialSummary {
  totalCollections: number;
  totalPledges: number;
}

export const useProjectFinancials = (projectId: string): ProjectFinancialSummary => {
  const totalCollections = React.useMemo(() => {
    return allProjectCollections
      .filter(c => c.projectId === projectId)
      .reduce((sum, c) => sum + c.amount, 0);
  }, [projectId]);

  const totalPledges = React.useMemo(() => {
    return allProjectPledges
      .filter(p => p.projectId === projectId)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [projectId]);

  return { totalCollections, totalPledges };
};