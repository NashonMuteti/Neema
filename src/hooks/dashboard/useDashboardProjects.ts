"use client";

import { useState, useEffect, useCallback } from "react";
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

  const [dashboardProjects, setDashboardProjects] = useState<DashboardProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const fetchDashboardProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsError(null);

    if (!currentUser) {
      setLoadingProjects(false);
      return;
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

      if (error) {
        console.error("Error fetching dashboard projects:", error);
        setProjectsError("Failed to load projects for dashboard.");
        setDashboardProjects([]);
        return;
      }

      setDashboardProjects(data.map(p => ({
        id: p.id,
        name: p.name,
        dueDate: p.due_date ? parseISO(p.due_date) : undefined,
        status: p.status as "Open" | "Closed" | "Deleted",
      })));
    } catch (err) {
      console.error("Unexpected error in fetchDashboardProjects:", err);
      setProjectsError("An unexpected error occurred while loading projects.");
    } finally {
      setLoadingProjects(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardProjects();
    }
  }, [currentUser, fetchDashboardProjects]);

  return { dashboardProjects, loadingProjects, projectsError };
};