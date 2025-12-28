"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";

interface DashboardProject {
  id: string;
  name: string;
  dueDate?: Date;
  status: "Open" | "Closed" | "Deleted";
}

export const useDashboardProjects = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const queryKey = ['dashboardProjects', currentUser?.id, isAdmin];

  const fetcher = async (): Promise<DashboardProject[]> => {
    if (!currentUser) {
      return [];
    }

    try {
      let query = supabase
        .from('projects')
        .select('id, name, due_date, status')
        .neq('status', 'Deleted');
      
      if (!isAdmin) {
        query = query.eq('profile_id', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(p => ({
        id: p.id,
        name: p.name,
        dueDate: p.due_date ? parseISO(p.due_date) : undefined,
        status: p.status as "Open" | "Closed" | "Deleted",
      }));
    } catch (err: any) {
      console.error("Error fetching dashboard projects:", err);
      showError("Failed to load projects for dashboard.");
      throw err;
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: fetcher,
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return {
    dashboardProjects: data || [],
    loadingProjects: isLoading,
    projectsError: error ? error.message : null,
  };
};