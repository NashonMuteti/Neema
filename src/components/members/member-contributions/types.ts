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

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const getContributionStatus = (type: MemberContribution['type'], status?: MemberContribution['status']): { text: string; variant: BadgeVariant } => {
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