import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

// Unified Transaction interface (copied from types.ts for context, but not exported here)
interface Transaction {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash' | 'pledge';
  date: Date;
  amount: number;
  description: string;
  accountOrProjectName: string;
  status?: "Active" | "Paid" | "Overdue";
  dueDate?: Date;
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