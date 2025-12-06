"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted";
}

const dummyDeletedProjects: Project[] = [
  { id: "proj4", name: "Archived Project A", description: "An old project that was deleted.", status: "Deleted" },
  { id: "proj5", name: "Legacy System Migration", description: "Project to migrate data from old system.", status: "Deleted" },
];

const DeletedProjectsReport = () => {
  const [deletedProjects, setDeletedProjects] = React.useState<Project[]>(dummyDeletedProjects);

  const handleRestoreProject = (projectId: string, projectName: string) => {
    // In a real app, this would update the project status in the backend
    setDeletedProjects((prev) => prev.filter((p) => p.id !== projectId));
    showSuccess(`Project '${projectName}' restored successfully.`);
    console.log("Restoring project:", projectId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Deleted Projects Report</h1>
      <p className="text-lg text-muted-foreground">
        View and manage projects that have been marked as deleted.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Deleted Projects List</CardTitle>
        </CardHeader>
        <CardContent>
          {deletedProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.description}</TableCell>
                    <TableCell className="text-center">{project.status}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreProject(project.id, project.name)}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No deleted projects found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletedProjectsReport;