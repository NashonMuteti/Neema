import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PostgrestError } from "@supabase/supabase-js";

export interface Project {
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
  amount: number;
  due_date: Date;
  status: "Active" | "Paid" | "Overdue";
}

export interface ProjectFinancialSummary {
  totalBudget: number;
  totalCollections: number;
  totalPledged: number; // Corrected from totalPledges
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
  payment_method: string;
  profiles: { name: string } | null; // Joined profile data
}

// Define the expected structure of a pledge row with joined profile data
interface PledgeRowWithProfile {
  id: string;
  project_id: string;
  member_id: string;
  amount: number;
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string } | null; // Joined profile data
}

export const getProjectFinancialSummary = async (projectId: string): Promise<ProjectFinancialSummary> => {
  // Fetch collections
  const { data: collectionsData, error: collectionsError } = await supabase
    .from('project_collections')
    .select(`
      id,
      project_id,
      member_id,
      amount,
      date,
      payment_method,
      profiles ( name )
    `) as { data: CollectionRowWithProfile[] | null, error: PostgrestError | null }; // Explicitly cast the result

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
  const { data: pledgesData, error: pledgesError } = await supabase
    .from('project_pledges')
    .select(`
      id,
      project_id,
      member_id,
      amount,
      due_date,
      status,
      profiles ( name )
    `) as { data: PledgeRowWithProfile[] | null, error: PostgrestError | null }; // Explicitly cast the result

  if (pledgesError) {
    console.error("Error fetching project pledges:", pledgesError);
    // Return partial data or throw error
  }

  const pledges: ProjectPledge[] = (pledgesData || []).map(p => ({
    id: p.id,
    project_id: p.project_id,
    member_id: p.member_id,
    member_name: p.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
    amount: p.amount,
    due_date: new Date(p.due_date),
    status: p.status as "Active" | "Paid" | "Overdue",
  }));

  // Fetch project budget (assuming projects table exists and has budget)
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('budget')
    .eq('id', projectId)
    .single();

  const totalBudget = projectData?.budget || 0;

  const totalCollections = collections.reduce((sum, c) => sum + c.amount, 0);
  const totalPledged = pledges.reduce((sum, p) => sum + p.amount, 0); // Corrected from totalPledges
  const totalOutstandingPledges = pledges
    .filter(p => p.status === "Active" || p.status === "Overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalBudget,
    totalCollections,
    totalPledged,
    totalOutstandingPledges,
    collections,
    pledges,
  };
};