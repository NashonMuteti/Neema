import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { User } from "@/context/AuthContext"; // Assuming User interface is defined here

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const getStatusBadgeClasses = (status: User['status']): BadgeVariant => {
  switch (status) {
    case "Active":
      return "default"; // Maps to primary color
    case "Inactive":
      return "destructive"; // Maps to red
    case "Suspended":
      return "secondary"; // Maps to secondary color (can be yellow/orange in some themes)
    default:
      return "outline"; // Neutral outline
  }
};