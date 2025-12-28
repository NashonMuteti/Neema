// src/types/common.ts

export interface FinancialAccount {
  id: string;
  name: string;
  initial_balance: number; // Added initial_balance
  current_balance: number;
  profile_id: string; // Added profile_id
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface MonthYearOption {
  value: string;
  label: string;
}

export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid"; // Status in DB is Active or Paid
  member_name: string;
  project_name: string;
  comments?: string;
}