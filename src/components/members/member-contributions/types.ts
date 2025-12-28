"use client";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export interface Transaction {
  id: string;
  type: 'income' | 'expenditure' | 'petty_cash' | 'pledge';
  date: Date;
  amount: number;
  description: string;
  accountOrProjectName: string;
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
  pledgeId?: string; // To link income transactions to pledges
}

export interface FinancialAccount {
  id: string; // Added id property
  name: string;
}

export interface IncomeTxRow {
  id: string;
  date: string;
  amount: number;
  source: string;
  financial_accounts: FinancialAccount | null;
  pledge_id: string | null; // To link income transactions to pledges
}

export interface ExpenditureTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccount | null;
}

export interface PettyCashTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: FinancialAccount | null;
}

export interface PledgeTxRow {
  id: string;
  due_date: string;
  amount: number;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: { name: string } | null;
}

export interface Project {
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

export interface MonthYearOption {
  value: string;
  label: string;
}

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