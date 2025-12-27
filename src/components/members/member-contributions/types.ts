import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export interface MemberContribution {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash' | 'pledge'; // Added 'pledge' type
  sourceOrPurpose: string;
  date: Date;
  amount: number;
  accountName: string; // For financial transactions, project name for pledges
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
  pledgeId?: string; // New: To link income transactions to pledges
}

export interface FinancialAccountName {
  name: string;
}

export interface IncomeTxRow {
  id: string;
  date: string;
  amount: number;
  source: string;
  financial_accounts: FinancialAccountName | null;
  pledge_id: string | null; // New: To link income transactions to pledges
}

export interface ExpenditureTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccountName | null;
}

export interface PettyCashTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccountName | null;
}

// New interface for fetching pledge data
export interface PledgeTxRow {
  id: string;
  due_date: string;
  amount: number;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: { name: string } | null;
}

// Generic Project interface for all active projects (system-wide)
export interface Project { 
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

export interface MonthYearOption {
  value: string;
  label: string;
}