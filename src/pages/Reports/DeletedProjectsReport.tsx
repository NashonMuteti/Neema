"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
}

const DeletedProjectsReport = () => {
  const [deletedProjects, setDeletedProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDeletedProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, status')
      .eq('status', 'Deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching deleted projects:", error);
      setError("Failed to load deleted projects.");
      setDeletedProjects([]);
    } else {
      setDeletedProjects(data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as "Open" | "Closed" | "Deleted" | "Suspended",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeletedProjects();
  }, [fetchDeletedProjects]);

  const handleRestoreProject = async (projectId: string, projectName: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: "Open" }) // Restore to "Open" status
      .eq('id', projectId);

    if (error) {
      console.error("Error restoring project:", error);
      showError("Failed to restore project.");
    } else {
      showSuccess(`Project '${projectName}' restored successfully.`);
      fetchDeletedProjects(); // Re-fetch to update the list
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Deleted Projects Report</h1>
        <p className="text-lg text-muted-foreground">Loading deleted projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Deleted Projects Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

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