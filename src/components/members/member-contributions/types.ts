import { BadgeVariant } from "@/components/ui/badge";

export interface MemberContribution {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash';
  sourceOrPurpose: string;
  date: Date;
  amount: number;
  accountName: string;
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

export const getContributionStatus = (type: MemberContribution['type']): { text: string; variant: BadgeVariant } => {
  if (type === 'income') {
    return { text: "Income", variant: "default" };
  } else if (type === 'expenditure') {
    return { text: "Expenditure", variant: "destructive" };
  } else if (type === 'petty_cash') {
    return { text: "Petty Cash", variant: "secondary" };
  }
  return { text: "Unknown", variant: "outline" };
};