"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { parseISO } from "date-fns";
import { showError } from "@/utils/toast";
import { Project } from "@/types/common"; // Import Project from common.ts
import { perfStart } from "@/utils/perf";

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
    const endAll = perfStart("useDashboardProjects:fetcher");

    if (!currentUser) {
      endAll({ skipped: true, reason: "no-currentUser" });
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

      const endQuery = perfStart("useDashboardProjects:projects.select");
      const { data, error } = await query;
      endQuery({ rows: data?.length ?? 0, errorCode: error?.code });
      if (error) throw error;

      const result = data.map(p => ({
        id: p.id,
        name: p.name,
        dueDate: p.due_date ? parseISO(p.due_date) : undefined,
        status: p.status as "Open" | "Closed" | "Deleted",
      }));

      endAll({ ok: true, rows: result.length });
      return result;
    } catch (err: any) {
      console.error("Error fetching dashboard projects:", err);
      showError("Failed to load projects for dashboard.");
      endAll({ ok: false });
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