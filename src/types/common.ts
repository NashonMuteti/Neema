// src/types/common.ts

// Core Entities
export interface FinancialAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  profile_id: string; // Owner of the account
  can_receive_payments: boolean; // New: Whether this account can receive payments
}

export interface Member { // Represents a profile as a member
  id: string;
  name: string;
  email: string;
}

export interface Project { // Minimal Project interface for general use
  id: string;
  name: string;
  member_contribution_amount?: number | null; // Optional, as not all contexts need it
}

// Transaction-related types
export interface MonthYearOption {
  value: string;
  label: string;
}

// Unified Transaction interface for dashboard, calendar, etc.
// This is a processed/display-ready transaction.
export interface Transaction {
  id: string;
  type: 'income' | 'expenditure' | 'pledge'; // Removed 'petty_cash'
  date: Date;
  amount: number;
  description: string; // General description/purpose/source
  accountOrProjectName: string; // Name of the associated account or project
  accountId?: string; // New: ID of the associated financial account, if applicable
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
  pledgeId?: string; // To link income transactions to pledges
}

// Raw data structures from Supabase joins (for internal use in fetchers)
// These represent the shape of data directly returned from Supabase queries with joins.
export interface JoinedFinancialAccount { // For joined 'financial_accounts'
  id: string;
  name: string;
}

export interface JoinedProject { // For joined 'projects'
  id: string;
  name: string;
}

export interface JoinedProfile { // For joined 'profiles'
  id: string;
  name: string;
  email: string;
}

export interface IncomeTxRow {
  id: string;
  date: string;
  amount: number;
  source: string;
  financial_accounts: JoinedFinancialAccount | null;
  pledge_id: string | null;
  profile_id: string; // Added profile_id for consistency
}

export interface ExpenditureTxRow {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  financial_accounts: JoinedFinancialAccount | null;
  profile_id: string; // Added profile_id for consistency
}

export interface PledgeTxRow {
  id: string;
  due_date: string;
  amount: number; // This is original_amount
  paid_amount: number;
  status: "Active" | "Paid" | "Overdue";
  comments?: string;
  projects: JoinedProject | null;
  profiles: JoinedProfile | null; // Added for member_name/email
  member_id: string; // Added member_id
  project_id: string; // Added project_id
}

// New: Raw data structure for Debts
export interface DebtRow {
  id: string;
  original_amount: number;
  amount_due: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue"; // Assuming similar statuses
  description?: string;
  created_at: string; // For sorting if due_date is null
  created_by_profile_id: string;
  debtor_profile_id: string;
}

// Processed data for MemberContributionsDetail page
export interface MemberContribution {
  id: string;
  type: 'income' | 'expenditure' | 'pledge'; // Removed 'petty_cash'
  sourceOrPurpose: string; // Description for income/expenditure, comments/project name for pledge
  date: Date;
  amount: number; // Actual amount for income/expenditure, original_amount for pledge
  accountName: string; // Financial account name for transactions, project name for pledges
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges
  dueDate?: Date; // Only for pledges
  pledgeId?: string; // To link income transactions to pledges
  original_amount?: number; // For pledges, the total pledged amount
  paid_amount?: number;     // For pledges, the amount already paid
}

// Processed data for MyContributions page (similar to MemberContribution but with project_name)
export interface MyContribution {
  id: string;
  project_id?: string; // Optional for debts
  project_name?: string; // Optional for debts
  description?: string; // New: For debts or additional context
  amount: number; // Actual amount for collection, original_amount for pledge/debt
  date: Date;
  type: "Collection" | "Pledge" | "Debt"; // Updated: Added "Debt"
  status?: "Active" | "Paid" | "Overdue"; // Only for pledges/debts
  original_amount?: number; // For pledges/debts, the total original amount
  paid_amount?: number;     // For pledges/debts, the amount already paid
  due_date?: Date;          // For pledges/debts
  expected_amount?: number; // Expected contribution amount for the project (for collections), or original_amount for pledges/debts
  balance_amount?: number;  // Expected - Actual for collections, Original - Paid for pledges, Amount_due for debts
}

export interface MyFinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

// Pledge interface for components that manage pledges (e.g., Pledges page, ProjectPledgesDialog)
export interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid"; // Status in DB is Active or Paid
  member_name: string;
  project_name: string;
  comments?: string;
}

// Product interface for sales management
export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  current_stock: number;
  reorder_point: number;
  profile_id: string;
  is_active: boolean; // New: Whether the product is active or inactive
}