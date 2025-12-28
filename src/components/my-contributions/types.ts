// src/components/my-contributions/types.ts

export interface MyContribution {
  id: string;
  project_id: string;
  project_name: string;
  amount: number;
  date: Date;
  type: "Collection" | "Pledge";
  status?: "Active" | "Paid"; // Only for pledges
  original_amount?: number; // For pledges, the total pledged amount
  paid_amount?: number;     // For pledges, the amount already paid
  due_date?: Date;          // For pledges
}

export interface MyFinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}