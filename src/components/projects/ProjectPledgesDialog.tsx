"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import ProjectPledgeForm from "./project-pledges/ProjectPledgeForm";
import ProjectPledgeTable from "./project-pledges/ProjectPledgeTable";
import { useProjectPledges } from "@/hooks/projects/useProjectPledges";

interface ProjectPledgesDialogProps {
  projectId: string;
  projectName: string;
  onPledgesUpdated: () => void;
}

const ProjectPledgesDialog: React.FC<ProjectPledgesDialogProps> = ({
  projectId,
  projectName,
  onPledgesUpdated,
}) => {
  const { currency } = useSystemSettings();
  const [isOpen, setIsOpen] = React.useState(false);

  const {
    pledges,
    members,
    financialAccounts,
    isLoading,
    error,
    canManagePledges,
    addPledge,
    markPledgeAsPaid,
    deletePledge,
  } = useProjectPledges({ projectId, projectName, onPledgesUpdated });

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canManagePledges}>
            <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
            <DialogDescription>
              View, add, and manage financial pledges for this project.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">Loading pledges and accounts...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canManagePledges}>
            <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
            <DialogDescription>
              View, add, and manage financial pledges for this project.
            </DialogDescription>
          </DialogHeader>
          <p className="text-destructive">Error: {error}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManagePledges}>
          <PlusCircle className="mr-2 h-4 w-4" /> Manage Pledges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage Pledges for {projectName}</DialogTitle>
          <DialogDescription>
            View, add, and manage financial pledges for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ProjectPledgeForm
            members={members}
            onAddPledge={addPledge}
            canManagePledges={canManagePledges}
            isProcessing={isLoading}
          />

          <ProjectPledgeTable
            pledges={pledges}
            canManagePledges={canManagePledges}
            onMarkAsPaid={markPledgeAsPaid}
            onDeletePledge={deletePledge}
            financialAccounts={financialAccounts}
            currency={currency}
            isProcessing={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPledgesDialog;