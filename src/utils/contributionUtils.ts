import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { Transaction } from "@/types/common"; // Updated import path

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