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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
}

const DeletedProjectsReport = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManageProjects } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageProjects: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageProjects = currentUserPrivileges.includes("Manage Projects");
    return { canManageProjects };
  }, [currentUser, definedRoles]);

  const [deletedProjects, setDeletedProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [projectToDeletePermanently, setProjectToDeletePermanently] = React.useState<{ id: string; name: string } | null>(null);

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
    if (!canManageProjects) {
      showError("You do not have permission to restore projects.");
      return;
    }
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

  const handlePermanentDeleteProject = async () => {
    if (!canManageProjects) {
      showError("You do not have permission to permanently delete projects.");
      setProjectToDeletePermanently(null); // Close dialog
      return;
    }
    if (projectToDeletePermanently) {
      const { id, name } = projectToDeletePermanently;
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error permanently deleting project:", error);
        showError(`Failed to permanently delete project '${name}'.`);
      } else {
        showSuccess(`Project '${name}' permanently deleted.`);
        fetchDeletedProjects(); // Re-fetch to update the list
      }
      setProjectToDeletePermanently(null); // Close dialog
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
                  {canManageProjects && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.description}</TableCell>
                    <TableCell className="text-center">{project.status}</TableCell>
                    {canManageProjects && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreProject(project.id, project.name)}
                          >
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setProjectToDeletePermanently({ id: project.id, name: project.name })}
                          >
                            Permanent Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No deleted projects found.</p>
          )}
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDeletePermanently} onOpenChange={(open) => !open && setProjectToDeletePermanently(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project "
              <span className="font-semibold">{projectToDeletePermanently?.name}</span>" and all its associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeletedProjectsReport;