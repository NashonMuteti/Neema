"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import CollectionsDialog from "@/components/projects/CollectionsDialog";
import ProjectPledgesDialog from "@/components/projects/ProjectPledgesDialog";
import { showSuccess, showError } from "@/utils/toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted";
}

const Projects = () => {
  const [projects, setProjects] = React.useState<Project[]>([
    { id: "proj1", name: "Film Production X", description: "Main film project for the year.", status: "Open" },
    { id: "proj2", name: "Marketing Campaign Y", description: "Promotional activities for new releases.", status: "Open" },
    { id: "proj3", name: "Post-Production Z", description: "Editing and final touches for upcoming film.", status: "Closed" },
    { id: "proj4", name: "Archived Project A", description: "An old project that was deleted.", status: "Deleted" },
  ]);
  const [filterStatus, setFilterStatus] = React.useState<"Open" | "Closed" | "All">("Open");

  const filteredProjects = projects.filter(project => {
    if (filterStatus === "All") {
      return project.status !== "Deleted"; // Show all non-deleted projects
    }
    return project.status === filterStatus;
  });

  const handleAddProject = (projectData: { name: string; description: string }) => {
    const newProject: Project = {
      id: `proj${projects.length + 1}`,
      name: projectData.name,
      description: projectData.description,
      status: "Open",
    };
    setProjects((prev) => [...prev, newProject]);
    console.log("Adding project:", newProject);
  };

  const handleCloseProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, status: project.status === "Open" ? "Closed" : "Open" }
          : project
      )
    );
    showSuccess("Project status updated!");
    console.log("Toggling project status for:", projectId);
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, status: "Deleted" } : project
      )
    );
    showSuccess(`Project '${projectName}' moved to deleted status.`);
    console.log("Deleting project:", projectId);
  };

  const handleSaveCollections = (data: any) => {
    console.log("Saving collections data:", data);
    // In a real app, send this data to the backend
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Project Accounts</h1>
      <p className="text-lg text-muted-foreground">
        Manage your project-specific financial contributions and reports here.
      </p>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Select value={filterStatus} onValueChange={(value: "Open" | "Closed" | "All") => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All (Excluding Deleted)</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <NewProjectDialog onAddProject={handleAddProject} />
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <Card key={project.id} className="transition-all duration-300 ease-in-out hover:shadow-xl">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Image Thumbnail Placeholder */}
                <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  <img src="/placeholder.svg" alt="Project Thumbnail" className="h-20 w-20 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">{project.description}</p>
                <p className="text-sm">Status: <span className="font-medium">{project.status}</span></p>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <CollectionsDialog
                      projectId={project.id}
                      projectName={project.name}
                      onSaveCollections={handleSaveCollections}
                    />
                    <ProjectPledgesDialog
                      projectId={project.id}
                      projectName={project.name}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseProject(project.id)}
                    >
                      {project.status === "Open" ? "Close Project" : "Reopen Project"}
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
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">No projects found with status "{filterStatus}".</p>
        )}
      </div>
    </div>
  );
};

export default Projects;