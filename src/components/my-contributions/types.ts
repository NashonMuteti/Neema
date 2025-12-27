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
}

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const getContributionStatus = (type: Transaction['type'], status?: Transaction['status']): { text: string; variant: BadgeVariant } => {
  if (type === 'income') {
    return { text: "Income", variant: "default" };
  } else if (type === 'expenditure') {
    return { text: "Expenditure", variant: "destructive" };
  } else if (type === 'petty_cash') {
    return { text: "Petty Cash", variant: "secondary" };
  } else if (type === 'pledge') {
    if (status === 'Paid') {
      return { text: "Pledge (Paid)", variant: "default" };
    } else if (status === 'Active' || status === 'Overdue') {
      return { text: "Pledge (Pending)", variant: "destructive" };
    }
  }
  return { text: "Unknown", variant: "outline" };
};

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

// Renamed from UserProject to Project for clarity, as it now represents any project
export interface Project { 
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

export interface MonthYearOption {
  value: string;
  label: string;
}