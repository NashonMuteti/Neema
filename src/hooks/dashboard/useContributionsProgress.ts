"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";

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
    if (!currentUser) {
      return [];
    }

    try {
      let activeMembersCount = 0;
      const { count: membersCount, error: membersCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');

      if (membersCountError) {
        console.error("Error fetching active members count:", membersCountError);
      } else {
        activeMembersCount = membersCount || 0;
      }

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, member_contribution_amount')
        .eq('status', 'Open');
      
      if (!isAdmin) {
        projectsQuery = projectsQuery.eq('profile_id', currentUser.id);
      }

      const { data: projectsData, error: projectsError } = await projectsQuery;
      if (projectsError) throw projectsError;

      const projectContributions: ProjectContributionData[] = [];
      for (const project of projectsData || []) {
        const expected = (project.member_contribution_amount || 0) * activeMembersCount; 

        let collectionsQuery = supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id);

        const { data: collectionsData, error: collectionsError } = await collectionsQuery;
        if (collectionsError) console.error(`Error fetching collections for project ${project.name}:`, collectionsError);
        const actualCollections = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        let allPledgesQuery = supabase
          .from('project_pledges')
          .select('amount, paid_amount')
          .eq('project_id', project.id);

        const { data: allPledgesData, error: allPledgesError } = await allPledgesQuery;
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
      return projectContributions;
    } catch (err: any) {
      console.error("Error fetching contributions progress:", err);
      showError("An unexpected error occurred while loading contributions progress.");
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