import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

// Unified Transaction interface
export interface Transaction {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash' | 'pledge';
  date: Date; // For sorting and calendar display
  amount: number;
  description: string; // sourceOrPurpose for financial, project_name for pledge
  accountOrProjectName: string; // accountName for financial, project_name for pledge
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
  pledgeId?: string; // New: To link income transactions to pledges
}

// Define expected structure for joined financial_accounts data
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

// Interface for projects created by a specific member, including their collections
export interface MemberProjectWithCollections {
  id: string;
  name: string;
  member_contribution_amount: number | null;
  totalCollections: number; // Amount actually collected for this project
}

export interface MonthYearOption {
  value: string;
  label: string;
}