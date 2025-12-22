"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import ProjectCard from "@/components/projects/ProjectCard"; // Import the new ProjectCard
import { useProjectManagement } from "@/hooks/use-project-management"; // Import the new hook

const Projects = () => {
  const {
    projects,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    canManageProjects,
    activeMembersCount,
    projectFinancialSummaries,
    handleAddProject,
    handleEditProject,
    handleToggleProjectStatus,
    handleDeleteProject,
    handleThumbnailUpload,
    refreshProjects, // Use the refresh function from the hook
  } = useProjectManagement();

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
                <SelectItem value="Suspended">Suspased</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="relative flex items-center">
            <Input 
              type="text" 
              placeholder="Search projects..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
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
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              activeMembersCount={activeMembersCount}
              projectSummary={projectFinancialSummaries.get(project.id) || { totalCollections: 0, totalPledged: 0 }}
              canManageProjects={canManageProjects}
              onEditProject={handleEditProject}
              onToggleStatus={handleToggleProjectStatus}
              onDeleteProject={handleDeleteProject}
              onThumbnailUpload={handleThumbnailUpload}
              onCollectionAdded={refreshProjects} // Pass refresh function
              onPledgesUpdated={refreshProjects} // Pass refresh function
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">No projects found with status "{filterStatus}" or matching your search.</p>
        )}
      </div>
    </div>
  );
};

export default Projects;