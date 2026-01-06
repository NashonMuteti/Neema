"use client";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { MemberContribution } from "@/types/common"; // Changed import to MemberContribution

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const getContributionStatus = (type: MemberContribution['type'], status?: MemberContribution['status']): { text: string; variant: BadgeVariant } => {
  if (type === 'income') {
    return { text: "Income", variant: "default" };
  } else if (type === 'expenditure') {
    return { text: "Expenditure", variant: "destructive" };
  } else if (type === 'pledge') {
    if (status === 'Paid') {
      return { text: "Pledge (Paid)", variant: "default" };
    } else if (status === 'Active' || status === 'Overdue') {
      return { text: "Pledge (Pending)", variant: "destructive" };
    }
  } else if (type === 'Debt') { // Handle Debt type
    if (status === 'Paid') {
      return { text: "Debt (Paid)", variant: "default" };
    } else if (status === 'Outstanding' || status === 'Partially Paid' || status === 'Overdue') {
      return { text: "Debt (Outstanding)", variant: "destructive" }; // Or a different variant if preferred
    }
  }
  return { text: "Unknown", variant: "outline" };
};