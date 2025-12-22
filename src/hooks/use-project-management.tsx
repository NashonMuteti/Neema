"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { getProjectFinancialSummary } from "@/utils/projectFinancials";
import { parseISO } from "date-fns";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
  thumbnailUrl?: string;
  dueDate?: Date;
  memberContributionAmount?: number;
  user_id: string;
}

export interface ProjectFinancialSummaryData {
  totalCollections: number;
  totalPledged: number;
}

export const useProjectManagement = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageProjects } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageProjects: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageProjects = currentUserPrivileges.includes("Manage Projects");
    return { canManageProjects };
  }, [currentUser, definedRoles]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [filterStatus, setFilterStatus] = useState<"Open" | "Closed" | "Suspended" | "All">("Open");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMembersCount, setActiveMembersCount] = useState(0);
  const [projectFinancialSummaries, setProjectFinancialSummaries] = useState<Map<string, ProjectFinancialSummaryData>>(new Map());
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Fetch active members count
  useEffect(() => {
    const fetchActiveMembersCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
        
      if (error) {
        console.error("Error fetching active members count:", error);
      } else {
        setActiveMembersCount(count || 0);
      }
    };
    fetchActiveMembersCount();
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase.from('projects').select('*');
    
    if (filterStatus !== "All") {
      query = query.eq('status', filterStatus);
    } else {
      query = query.neq('status', 'Deleted');
    }
    
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to load projects.");
      showError("Failed to load projects.");
      setProjects([]);
    } else {
      setProjects(data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as "Open" | "Closed" | "Deleted" | "Suspended",
        thumbnailUrl: p.thumbnail_url || undefined,
        dueDate: p.due_date ? parseISO(p.due_date) : undefined,
        memberContributionAmount: p.member_contribution_amount || undefined,
        user_id: p.user_id,
      })));
    }
    setLoading(false);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const fetchAllProjectFinancials = async () => {
      setLoadingFinancials(true);
      const newSummaries = new Map<string, ProjectFinancialSummaryData>();
      
      for (const project of projects) {
        try {
          const summary = await getProjectFinancialSummary(project.id);
          newSummaries.set(project.id, {
            totalCollections: summary.totalCollections,
            totalPledged: summary.totalPledged,
          });
        } catch (err) {
          console.error(`Failed to fetch financial summary for project ${project.name}:`, err);
          newSummaries.set(project.id, {
            totalCollections: 0,
            totalPledged: 0
          });
        }
      }
      setProjectFinancialSummaries(newSummaries);
      setLoadingFinancials(false);
    };
    
    if (projects.length > 0) {
      fetchAllProjectFinancials();
    } else {
      setProjectFinancialSummaries(new Map());
    }
  }, [projects]);

  const handleAddProject = useCallback(async (projectData: { 
    name: string; 
    description: string; 
    thumbnailUrl?: string; 
    dueDate?: Date; 
    memberContributionAmount?: number 
  }) => {
    if (!currentUser) {
      showError("You must be logged in to add a project.");
      return;
    }
    
    const { error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        status: "Open",
        thumbnail_url: projectData.thumbnailUrl,
        due_date: projectData.dueDate?.toISOString(),
        member_contribution_amount: projectData.memberContributionAmount,
        user_id: currentUser.id,
      });
      
    if (error) {
      console.error("Error adding project:", error);
      showError("Failed to add project.");
    } else {
      showSuccess("Project added successfully!");
      fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  const handleEditProject = useCallback(async (updatedProject: Project) => {
    if (!currentUser || updatedProject.user_id !== currentUser.id) {
      showError("You do not have permission to edit this project.");
      return;
    }
    
    const { error } = await supabase
      .from('projects')
      .update({
        name: updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
        thumbnail_url: updatedProject.thumbnailUrl,
        due_date: updatedProject.dueDate?.toISOString(),
        member_contribution_amount: updatedProject.memberContributionAmount,
      })
      .eq('id', updatedProject.id);
      
    if (error) {
      console.error("Error updating project:", error);
      showError("Failed to update project.");
    } else {
      showSuccess(`Project '${updatedProject.name}' updated successfully!`);
      fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  const handleToggleProjectStatus = useCallback(async (projectId: string, currentStatus: Project['status']) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.user_id !== currentUser.id) {
      showError("You do not have permission to change the status of this project.");
      return;
    }
    
    let newStatus: Project['status'];
    if (currentStatus === "Open") {
      newStatus = "Suspended";
    } else if (currentStatus === "Suspended") {
      newStatus = "Closed";
    } else if (currentStatus === "Closed") {
      newStatus = "Open";
    } else {
      newStatus = "Open";
    }
    
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);
      
    if (error) {
      console.error("Error updating project status:", error);
      showError("Failed to update project status.");
    } else {
      showSuccess(`Project status updated to '${newStatus}'!`);
      fetchProjects();
    }
  }, [currentUser, projects, fetchProjects]);

  const handleDeleteProject = useCallback(async (projectId: string, projectName: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.user_id !== currentUser.id) {
      showError("You do not have permission to delete this project.");
      return;
    }
    
    const { error } = await supabase
      .from('projects')
      .update({ status: "Deleted" })
      .eq('id', projectId);
      
    if (error) {
      console.error("Error deleting project:", error);
      showError("Failed to delete project.");
    } else {
      showSuccess(`Project '${projectName}' moved to deleted status.`);
      fetchProjects();
    }
  }, [currentUser, projects, fetchProjects]);

  const handleThumbnailUpload = useCallback(async (projectId: string, newUrl: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.user_id !== currentUser.id) {
      showError("You do not have permission to upload a thumbnail for this project.");
      return;
    }
    
    const { error } = await supabase
      .from('projects')
      .update({ thumbnail_url: newUrl })
      .eq('id', projectId);
      
    if (error) {
      console.error("Error updating project thumbnail:", error);
      showError("Failed to update project thumbnail.");
    } else {
      showSuccess(`Thumbnail for project updated successfully!`);
      fetchProjects();
    }
  }, [currentUser, projects, fetchProjects]);

  return {
    projects,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    loading: loading || loadingFinancials,
    error,
    canManageProjects,
    activeMembersCount,
    projectFinancialSummaries,
    handleAddProject,
    handleEditProject,
    handleToggleProjectStatus,
    handleDeleteProject,
    handleThumbnailUpload,
    refreshProjects: fetchProjects, // Expose refresh function
  };
};