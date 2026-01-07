"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react"; // Ensure useMemo is imported
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import EditProjectDialog from "@/components/projects/EditProjectDialog";
import CollectionsDialog from "@/components/projects/CollectionsDialog";
import ProjectPledgesDialog from "@/components/projects/ProjectPledgesDialog";
import UploadThumbnailDialog from "@/components/projects/UploadThumbnailDialog";
import { showSuccess, showError } from "@/utils/toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Image as ImageIcon, CalendarIcon, DollarSign, Handshake, Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getProjectFinancialSummary, ProjectFinancialSummary } from "@/utils/projectFinancials";
import { Input } from "@/components/ui/input";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { useQueryClient } from "@tanstack/react-query"; // New import
import { Project as CommonProject, FinancialAccount, MonthYearOption } from "@/types/common"; // Import Project and FinancialAccount from common.ts
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
  thumbnailUrl?: string;
  dueDate?: Date;
  memberContributionAmount?: number;
  profile_id: string; // Changed from user_id to profile_id
}

const Projects = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context
  const queryClient = useQueryClient(); // Initialize queryClient
  
  // Calculate canManageProjects using useMemo for stability
  const { canManageProjects } = useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageProjects: false };
    }
    
    // Super Admin can manage projects
    if (currentUser.role === "Super Admin") {
      return { canManageProjects: true };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageProjects = currentUserPrivileges.includes("Manage Projects");
    
    return { canManageProjects };
  }, [currentUser, definedRoles]);

  const [activeMembersCount, setActiveMembersCount] = useState(0); // New state for active members count
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [filterStatus, setFilterStatus] = React.useState<"Open" | "Closed" | "Suspended" | "All">("Open");
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(""); // Local state for input
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500); // Debounced search query

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [projectFinancialSummaries, setProjectFinancialSummaries] = useState<Map<string, { totalCollections: number; totalPledged: number }>>(new Map());
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
  };

  // New useEffect to fetch active members count
  useEffect(() => {
    const fetchActiveMembersCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
        
      if (error) {
        console.error("Error fetching active members count:", error);
        // Handle error, maybe set count to 0
      } else {
        setActiveMembersCount(count || 0);
      }
    };
    
    fetchActiveMembersCount();
  }, []); // Run once on mount

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase.from('projects').select('*');
    
    if (filterStatus !== "All") {
      query = query.eq('status', filterStatus);
    } else {
      // Exclude 'Deleted' projects from 'All' view
      query = query.neq('status', 'Deleted');
    }
    
    if (debouncedSearchQuery) { // Use debounced query
      query = query.ilike('name', `%${debouncedSearchQuery}%`);
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
        dueDate: p.due_date ? new Date(p.due_date) : undefined,
        memberContributionAmount: p.member_contribution_amount || undefined,
        profile_id: p.profile_id, // Changed from user_id to profile_id
      })));
    }
    
    setLoading(false);
  }, [filterStatus, debouncedSearchQuery]); // Depend on debounced query

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const fetchAllProjectFinancials = async () => {
      setLoadingFinancials(true);
      const newSummaries = new Map<string, { totalCollections: number; totalPledged: number }>();
      
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
          }); // Provide defaults on error
        }
      }
      
      setProjectFinancialSummaries(newSummaries);
      setLoadingFinancials(false);
    };
    
    if (projects.length > 0) {
      fetchAllProjectFinancials();
    } else {
      setProjectFinancialSummaries(new Map()); // Clear if no projects
    }
  }, [projects]); // Re-run when the list of projects changes

  const handleAddProject = async (projectData: { 
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
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        status: "Open",
        thumbnail_url: projectData.thumbnailUrl,
        due_date: projectData.dueDate?.toISOString(),
        member_contribution_amount: projectData.memberContributionAmount,
        profile_id: currentUser.id, // Assign current user's profile_id as creator
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error adding project:", error);
      showError("Failed to add project.");
    } else {
      showSuccess("Project added successfully!");
      fetchProjects(); // Re-fetch projects to update the list
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleEditProject = async (updatedProject: Project) => {
    if (!currentUser || updatedProject.profile_id !== currentUser.id) { // Changed from user_id to profile_id
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
      fetchProjects(); // Re-fetch projects to update the list
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleToggleProjectStatus = async (projectId: string, currentStatus: Project['status']) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.profile_id !== currentUser.id) { // Changed from user_id to profile_id
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
      newStatus = "Open"; // Default if status is 'Deleted' or unknown
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
      fetchProjects(); // Re-fetch projects to update the list
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.profile_id !== currentUser.id) { // Changed from user_id to profile_id
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
      fetchProjects(); // Re-fetch projects to update the list
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  const handleSaveCollections = (data: any) => {
    console.log("Saving collections data:", data);
    // This would involve inserting into a 'collections' table
  };

  const handleThumbnailUpload = async (projectId: string, newUrl: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    
    if (!projectToUpdate || !currentUser || projectToUpdate.profile_id !== currentUser.id) { // Changed from user_id to profile_id
      showError("You do not have permission to upload a thumbnail for this project.");
      return;
    }
    
    // In a real app, you'd upload the file to Supabase Storage here
    // For now, we're using a blob URL for preview.
    const { error } = await supabase
      .from('projects')
      .update({ thumbnail_url: newUrl })
      .eq('id', projectId);
      
    if (error) {
      console.error("Error updating project thumbnail:", error);
      showError("Failed to update project thumbnail.");
    } else {
      showSuccess(`Thumbnail for project updated successfully!`);
      fetchProjects(); // Re-fetch projects to update the list
      invalidateDashboardQueries(); // Invalidate dashboard queries
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Project Accounts</h1>
        <p className="text-lg text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Project Accounts</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Project Accounts</h1>
      <p className="text-lg text-muted-foreground">
        Manage your project-specific financial contributions and reports here.
      </p>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Select 
            value={filterStatus} 
            onValueChange={(value: "Open" | "Closed" | "Suspended" | "All") => setFilterStatus(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All (Excluding Deleted)</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="relative flex items-center">
            <Input 
              type="text" 
              placeholder="Search projects..." 
              value={localSearchQuery} // Use local state for input
              onChange={(e) => setLocalSearchQuery(e.target.value)} // Update local state
              className="pl-8" 
            />
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {canManageProjects && (
          <NewProjectDialog onAddProject={handleAddProject} />
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map((project) => {
            const expectedAmount = (project.memberContributionAmount || 0) * activeMembersCount;
            const projectSummary = projectFinancialSummaries.get(project.id);
            const totalCollections = projectSummary?.totalCollections || 0;
            // Fix: Use totalPledged instead of totalPledges
            const totalPledges = projectSummary?.totalPledged || 0;
            
            return (
              <Card key={project.id} className="transition-all duration-300 ease-in-out hover:shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Added flex classes */}
                  <CardTitle>{project.name}</CardTitle>
                  <div className="w-48 h-48 bg-muted rounded-md flex items-center justify-center overflow-hidden"> {/* Moved and resized */}
                    {project.thumbnailUrl ? (
                      <img src={project.thumbnailUrl} alt="Project Thumbnail" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-32 w-32 text-muted-foreground" /> {/* Scaled icon */}
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Removed the old thumbnail div from here */}
                  <p className="text-muted-foreground text-sm">{project.description}</p>
                  <p className="text-sm">
                    Status: <span className="font-medium">{project.status}</span>
                  </p>
                  {project.dueDate && (
                    <p className="text-sm flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      Due: <span className="font-medium">{format(project.dueDate, "MMM dd, yyyy")}</span>
                    </p>
                  )}
                  {project.memberContributionAmount !== undefined && (
                    <p className="text-sm">
                      Member Contribution: <span className="font-medium">{currency.symbol}{project.memberContributionAmount.toFixed(2)}</span>
                    </p>
                  )}
                  <p className="text-sm">
                    Expected Total (from {activeMembersCount} members): <span className="font-medium">{currency.symbol}{expectedAmount.toFixed(2)}</span>
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <p className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Collected: 
                    </p>
                    <span className="font-medium text-green-600">{currency.symbol}{totalCollections.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="flex items-center gap-1">
                      <Handshake className="h-4 w-4 text-blue-600" />
                      Pledged: 
                    </p>
                    <span className="font-medium text-blue-600">{currency.symbol}{totalPledges.toFixed(2)}</span>
                  </div>
                  {canManageProjects && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link to={`/projects/${project.id}/financials`}>
                        <Button variant="outline" size="sm">
                          <DollarSign className="mr-2 h-4 w-4" />
                          View Financials
                        </Button>
                      </Link>
                      <CollectionsDialog 
                        projectId={project.id} 
                        projectName={project.name} 
                        onCollectionAdded={fetchProjects} 
                      />
                      <ProjectPledgesDialog 
                        projectId={project.id} 
                        projectName={project.name} 
                        onPledgesUpdated={fetchProjects} 
                      />
                      <EditProjectDialog 
                        project={project} 
                        onEditProject={handleEditProject} 
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleProjectStatus(project.id, project.status)}
                      >
                        {project.status === "Open" ? "Suspend" : project.status === "Suspended" ? "Close" : "Reopen"}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteProject(project.id, project.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-muted-foreground col-span-full">No projects found with status "{filterStatus}" or matching your search.</p>
        )}
      </div>
    </div>
  );
};

export default Projects;