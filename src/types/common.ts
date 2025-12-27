// src/types/common.ts

export interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
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