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