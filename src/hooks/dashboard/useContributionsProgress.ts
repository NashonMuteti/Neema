"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { Project } from "@/types/common"; // Import Project from common.ts
import { perfStart } from "@/utils/perf";

interface ProjectContributionData {
  name: string;
  expected: number;
  actual: number;
  pledged: number; // New: Total pledged amount
}

export const useContributionsProgress = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const queryKey = ['contributionsProgress', currentUser?.id, isAdmin];

  const fetcher = async (): Promise<ProjectContributionData[]> => {
    const endAll = perfStart("useContributionsProgress:fetcher");

    if (!currentUser) {
      endAll({ skipped: true, reason: "no-currentUser" });
      return [];
    }

    try {
      let activeMembersCount = 0;
      const endCount = perfStart("useContributionsProgress:profiles.countActive");
      const { count, error: membersCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
      endCount({ count: count ?? 0, errorCode: membersCountError?.code });

      if (membersCountError) {
        console.error("Error fetching active members count:", membersCountError);
      } else {
        activeMembersCount = count || 0;
      }

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, member_contribution_amount')
        .eq('status', 'Open');
      
      if (!isAdmin) {
        projectsQuery = projectsQuery.eq('profile_id', currentUser.id);
      }

      const endProjects = perfStart("useContributionsProgress:projects.select");
      const { data: projectsData, error: projectsError } = await projectsQuery;
      endProjects({ rows: projectsData?.length ?? 0, errorCode: projectsError?.code });
      if (projectsError) throw projectsError;

      const projectContributions: ProjectContributionData[] = [];
      const projects = projectsData || [];

      const endLoop = perfStart("useContributionsProgress:perProject.loop");
      for (const project of projects) {
        const expected = (project.member_contribution_amount || 0) * activeMembersCount;

        const endCollections = perfStart(`useContributionsProgress:collections:${project.id}`);
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id);
        endCollections({ rows: collectionsData?.length ?? 0, errorCode: collectionsError?.code });
        if (collectionsError) console.error(`Error fetching collections for project ${project.name}:`, collectionsError);
        const actualCollections = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        const endPledges = perfStart(`useContributionsProgress:pledges:${project.id}`);
        const { data: allPledgesData, error: allPledgesError } = await supabase
          .from('project_pledges')
          .select('amount, paid_amount')
          .eq('project_id', project.id);
        endPledges({ rows: allPledgesData?.length ?? 0, errorCode: allPledgesError?.code });
        if (allPledgesError) console.error(`Error fetching all pledges for project ${project.name}:`, allPledgesError);
        const totalPledged = (allPledgesData || []).reduce((sum, p) => sum + p.amount, 0);
        const totalPaidPledges = (allPledgesData || []).reduce((sum, p) => sum + p.paid_amount, 0);

        projectContributions.push({
          name: project.name,
          expected: expected,
          actual: actualCollections + totalPaidPledges,
          pledged: totalPledged,
        });
      }
      endLoop({ projects: projects.length });

      endAll({ ok: true, projects: projects.length });
      return projectContributions;
    } catch (err: any) {
      console.error("Error fetching contributions progress:", err);
      showError("An unexpected error occurred while loading contributions progress.");
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
    contributionsProgressData: data || [],
    loadingContributions: isLoading,
    contributionsError: error ? error.message : null,
  };
};