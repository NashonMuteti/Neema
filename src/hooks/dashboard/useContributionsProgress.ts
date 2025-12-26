"use client";

import { useState, useEffect, useCallback } from "react";
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

  const [contributionsProgressData, setContributionsProgressData] = useState<ProjectContributionData[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [contributionsError, setContributionsError] = useState<string | null>(null);

  const fetchContributionsProgress = useCallback(async () => {
    setLoadingContributions(true);
    setContributionsError(null);

    if (!currentUser) {
      setLoadingContributions(false);
      return;
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

      if (projectsError) {
        console.error("Error fetching projects for contributions progress:", projectsError);
        setContributionsError("Failed to load projects for contributions progress.");
        setContributionsProgressData([]);
        return;
      }

      const projectContributions: ProjectContributionData[] = [];
      for (const project of projectsData || []) {
        const expected = (project.member_contribution_amount || 0) * activeMembersCount; 

        let collectionsQuery = supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id);

        const { data: collectionsData, error: collectionsError } = await collectionsQuery;

        if (collectionsError) {
          console.error(`Error fetching collections for project ${project.name}:`, collectionsError);
        }

        const actualCollections = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        // Fetch all pledges for the project to get the total pledged amount
        let allPledgesQuery = supabase
          .from('project_pledges')
          .select('amount')
          .eq('project_id', project.id);

        const { data: allPledgesData, error: allPledgesError } = await allPledgesQuery;

        if (allPledgesError) {
          console.error(`Error fetching all pledges for project ${project.name}:`, allPledgesError);
        }
        const totalPledged = (allPledgesData || []).reduce((sum, p) => sum + p.amount, 0);

        // Fetch only paid pledges for the 'actual' calculation
        let paidPledgesQuery = supabase
          .from('project_pledges')
          .select('amount')
          .eq('project_id', project.id)
          .eq('status', 'Paid');

        const { data: paidPledgesData, error: paidPledgesError } = await paidPledgesQuery;

        if (paidPledgesError) {
          console.error(`Error fetching paid pledges for project ${project.name}:`, paidPledgesError);
        }

        const actualPaidPledges = (paidPledgesData || []).reduce((sum, p) => sum + p.amount, 0);

        projectContributions.push({
          name: project.name,
          expected: expected,
          actual: actualCollections + actualPaidPledges, // Actual is sum of collections and paid pledges
          pledged: totalPledged, // Total pledged (active + paid)
        });
      }
      setContributionsProgressData(projectContributions);
    } catch (err) {
      console.error("Unexpected error in fetchContributionsProgress:", err);
      setContributionsError("An unexpected error occurred while loading contributions progress.");
    } finally {
      setLoadingContributions(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchContributionsProgress();
    }
  }, [currentUser, fetchContributionsProgress]);

  return { contributionsProgressData, loadingContributions, contributionsError };
};