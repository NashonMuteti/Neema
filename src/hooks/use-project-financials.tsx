import React, { useState, useEffect, useCallback } from 'react';
import { getProjectFinancialSummary, ProjectFinancialSummary, ProjectCollection, ProjectPledge } from '@/utils/projectFinancials';
import { showError } from '@/utils/toast';

interface UseProjectFinancialsResult {
  financialSummary: ProjectFinancialSummary | null;
  loading: boolean;
  error: string | null;
  refreshFinancials: () => void;
  collections: ProjectCollection[];
  pledges: ProjectPledge[];
}

export const useProjectFinancials = (projectId: string | undefined): UseProjectFinancialsResult => {
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = useCallback(async () => {
    if (!projectId) {
      setFinancialSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await getProjectFinancialSummary(projectId);
      setFinancialSummary(summary);
    } catch (err) {
      console.error("Failed to fetch project financials:", err);
      setError("Failed to load project financial data.");
      showError("Failed to load project financial data.");
      setFinancialSummary(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return {
    financialSummary,
    loading,
    error,
    refreshFinancials: fetchFinancials,
    collections: financialSummary?.collections || [],
    pledges: financialSummary?.pledges || [],
  };
};

// Export the types
export type { ProjectPledge, ProjectCollection };