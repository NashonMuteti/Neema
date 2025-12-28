import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PostgrestError } from "@supabase/supabase-js";
import {
  Project as CommonProject, // Renamed to avoid conflict with local interface
  JoinedFinancialAccount,
  JoinedProject,
  JoinedProfile,
} from "@/types/common";

export interface Project { // This is a local interface, not the common one
  id: string;
  name: string;
  description: string;
  status: "Active" | "Completed" | "On Hold";
  startDate: Date;
  endDate: Date;
  budget: number;
  imageUrl?: string;
}

export interface ProjectCollection {
  id: string;
  project_id: string;
  member_id: string;
  member_name: string; // Joined from profiles
  amount: number;
  date: Date;
  payment_method: string;
}

export interface ProjectPledge {
  id: string;
  project_id: string;
  member_id: string;
  member_name: string; // Joined from profiles
  original_amount: number; // The total amount pledged
  paid_amount: number;     // The amount already paid towards the pledge
  due_date: Date;
  status: "Active" | "Paid"; // Status in DB is Active or Paid
}

export interface ProjectFinancialSummary {
  totalBudget: number;
  totalCollections: number;
  totalPledged: number;
  totalOutstandingPledges: number;
  collections: ProjectCollection[];
  pledges: ProjectPledge[];
}

// Define the expected structure of a collection row with joined profile data
interface CollectionRowWithProfile {
  id: string;
  project_id: string;
  member_id: string;
  amount: number;
  date: string; // ISO string from DB
  profiles: JoinedProfile | null; // Joined profile data
}

// Define the expected structure of a pledge row with joined profile and project data
interface PledgeRowWithProfile {
  id: string;
  project_id: string;
  member_id: string;
  amount: number; // This is original_amount
  paid_amount: number; // New field
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue";
  profiles: JoinedProfile | null; // Joined profile data
}

export const getProjectFinancialSummary = async (projectId: string): Promise<ProjectFinancialSummary> => {
  // Fetch collections
  const { data: collectionsData, error: collectionsError } = (await supabase
    .from('project_collections')
    .select(`
      id,
      project_id,
      member_id,
      amount,
      date,
      payment_method,
      profiles ( name )
    `)
    .eq('project_id', projectId)) as { data: CollectionRowWithProfile[] | null, error: PostgrestError | null };

  if (collectionsError) {
    console.error("Error fetching project collections:", collectionsError);
    // Return partial data or throw error
  }

  const collections: ProjectCollection[] = (collectionsData || []).map(c => ({
    id: c.id,
    project_id: c.project_id,
    member_id: c.member_id,
    member_name: c.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
    amount: c.amount,
    date: new Date(c.date),
    payment_method: c.payment_method,
  }));

  // Fetch pledges
  const { data: pledgesData, error: pledgesError } = (await supabase
    .from('project_pledges')
    .select(`
      id,
      project_id,
      member_id,
      amount,
      paid_amount,
      due_date,
      status,
      profiles ( name )
    `)
    .eq('project_id', projectId)) as { data: PledgeRowWithProfile[] | null, error: PostgrestError | null };

  if (pledgesError) {
    console.error("Error fetching project pledges:", pledgesError);
    // Return partial data or throw error
  }

  const pledges: ProjectPledge[] = (pledgesData || []).map(p => ({
    id: p.id,
    project_id: p.project_id,
    member_id: p.member_id,
    member_name: p.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
    original_amount: p.amount,
    paid_amount: p.paid_amount,
    due_date: new Date(p.due_date),
    status: p.status === "Overdue" ? "Active" : p.status as "Active" | "Paid", // Convert Overdue to Active for internal consistency
  }));

  // Fetch project budget (assuming projects table exists and has budget)
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('member_contribution_amount') // Changed to member_contribution_amount as budget is not directly available
    .eq('id', projectId)
    .single();

  const totalBudget = projectData?.member_contribution_amount || 0; // Use member_contribution_amount as a proxy for budget

  const totalCollections = collections.reduce((sum, c) => sum + c.amount, 0);
  const totalPledged = pledges.reduce((sum, p) => sum + p.original_amount, 0);
  const totalOutstandingPledges = pledges
    .filter(p => p.paid_amount < p.original_amount) // Outstanding if paid_amount is less than original_amount
    .reduce((sum, p) => sum + (p.original_amount - p.paid_amount), 0);

  return {
    totalBudget,
    totalCollections,
    totalPledged,
    totalOutstandingPledges,
    collections,
    pledges,
  };
};