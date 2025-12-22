"use client";
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, CalendarIcon, DollarSign, Handshake } from "lucide-react";
import { format } from "date-fns";
import CollectionsDialog from "@/components/projects/CollectionsDialog";
import ProjectPledgesDialog from "@/components/projects/ProjectPledgesDialog";
import EditProjectDialog from "@/components/projects/EditProjectDialog";
import UploadThumbnailDialog from "@/components/projects/UploadThumbnailDialog";
import { Project, ProjectFinancialSummaryData } from "@/hooks/use-project-management";

interface ProjectCardProps {
  project: Project;
  activeMembersCount: number;
  projectSummary: ProjectFinancialSummaryData;
  canManageProjects: boolean;
  onEditProject: (projectData: Project) => void;
  onToggleStatus: (projectId: string, currentStatus: Project['status']) => void;
  onDeleteProject: (projectId: string, projectName: string) => void;
  onThumbnailUpload: (projectId: string, newUrl: string) => void;
  onCollectionAdded: () => void; // To refresh project list after collection
  onPledgesUpdated: () => void; // To refresh project list after pledge update
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  activeMembersCount,
  projectSummary,
  canManageProjects,
  onEditProject,
  onToggleStatus,
  onDeleteProject,
  onThumbnailUpload,
  onCollectionAdded,
  onPledgesUpdated,
}) => {
  const expectedAmount = (project.memberContributionAmount || 0) * activeMembersCount;

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          {project.thumbnailUrl ? (
            <img src={project.thumbnailUrl} alt="Project Thumbnail" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-20 w-20 text-muted-foreground" />
          )}
        </div>
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
            Member Contribution: <span className="font-medium">${project.memberContributionAmount.toFixed(2)}</span>
          </p>
        )}
        <p className="text-sm">
          Expected Total (from {activeMembersCount} members): <span className="font-medium">${expectedAmount.toFixed(2)}</span>
        </p>
        <div className="flex items-center justify-between text-sm">
          <p className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            Collected: 
          </p>
          <span className="font-medium text-green-600">${projectSummary.totalCollections.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <p className="flex items-center gap-1">
            <Handshake className="h-4 w-4 text-blue-600" />
            Pledged: 
          </p>
          <span className="font-medium text-blue-600">${projectSummary.totalPledged.toFixed(2)}</span>
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
              onCollectionAdded={onCollectionAdded} 
            />
            <ProjectPledgesDialog 
              projectId={project.id} 
              projectName={project.name} 
              onPledgesUpdated={onPledgesUpdated} 
            />
            <EditProjectDialog 
              project={project} 
              onEditProject={onEditProject} 
            />
            <UploadThumbnailDialog
              projectId={project.id}
              projectName={project.name}
              currentThumbnailUrl={project.thumbnailUrl}
              onThumbnailUpload={onThumbnailUpload}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onToggleStatus(project.id, project.status)}
            >
              {project.status === "Open" ? "Suspend" : project.status === "Suspended" ? "Close" : "Reopen"}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDeleteProject(project.id, project.name)}
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectCard;