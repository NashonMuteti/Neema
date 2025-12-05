"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import EditProjectDialog from "@/components/projects/EditProjectDialog";
import CollectionsDialog from "@/components/projects/CollectionsDialog";
import ProjectPledgesDialog from "@/components/projects/ProjectPledgesDialog";
import UploadThumbnailDialog from "@/components/projects/UploadThumbnailDialog";
import { showSuccess, showError } from "@/utils/toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, CalendarIcon } from "lucide-react"; // Import CalendarIcon
import { format } from "date-fns"; // Import format for date display

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted";
  thumbnailUrl?: string; // Added optional thumbnail URL
  dueDate?: Date; // New: Optional due date
}

const Projects = () => {
  const [projects, setProjects] = React.useState<Project[]>([
    { id: "proj1", name: "Film Production X", description: "Main film project for the year.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 11, 15) }, // Dec 15, 2024
    { id: "proj2", name: "Marketing Campaign Y", description: "Promotional activities for new releases.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 7, 30) }, // Aug 30, 2024
    { id: "proj3", name: "Post-Production Z", description: "Editing and final touches for upcoming film.", status: "Closed", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 8, 10) }, // Sep 10, 2024
    { id: "proj4", name: "Archived Project A", description: "An old project that was deleted.", status: "Deleted" },
    { id: "proj5", name: "Short Film Contest", description: "Submission for a local short film festival.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 6, 20) }, // July 20, 2024
    { id: "proj6", name: "Documentary Research", description: "Initial research phase for a new documentary.", status: "Open", thumbnailUrl: "/placeholder.svg" }, // No due date
  ]);
  const [filterStatus, setFilterStatus] = React.useState<"Open" | "Closed" | "All">("Open");

  const filteredProjects = projects
    .filter(project => {
      if (filterStatus === "All") {
        return project.status !== "Deleted"; // Show all non-deleted projects
      }
      return project.status === filterStatus;
    })
    .sort((a, b) => {
      // Sort by due date: soonest due on top, projects without due date last
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1; // a has a due date, b doesn't, so a comes first
      if (b.dueDate) return 1;  // b has a due date, a doesn't, so b comes first
      return 0; // Neither has a due date, maintain original order
    });

  const handleAddProject = (projectData: { name: string; description: string; thumbnailUrl?: string; dueDate?: Date }) => {
    const newProject: Project = {
      id: `proj${projects.length + 1}`,
      name: projectData.name,
      description: projectData.description,
      status: "Open",
      thumbnailUrl: projectData.thumbnailUrl || "/placeholder.svg", // Use uploaded thumbnail or default
      dueDate: projectData.dueDate,
    };
    setProjects((prev) => [...prev, newProject]);
    console.log("Adding project:", newProject);
  };

  const handleEditProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    showSuccess(`Project '${updatedProject.name}' updated successfully!`);
    console.log("Editing project:", updatedProject);
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

  const handleThumbnailUpload = (projectId: string, newUrl: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, thumbnailUrl: newUrl } : project
      )
    );
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
                {/* Project Image Thumbnail */}
                <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {project.thumbnailUrl ? (
                    <img src={project.thumbnailUrl} alt="Project Thumbnail" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-20 w-20 text-muted-foreground" />
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{project.description}</p>
                <p className="text-sm">Status: <span className="font-medium">{project.status}</span></p>
                {project.dueDate && (
                  <p className="text-sm flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    Due: <span className="font-medium">{format(project.dueDate, "MMM dd, yyyy")}</span>
                  </p>
                )}
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
                    <EditProjectDialog project={project} onEditProject={handleEditProject} />
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