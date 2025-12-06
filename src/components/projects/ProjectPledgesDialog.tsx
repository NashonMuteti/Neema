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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

interface Pledge {
  id: string;
  member: string;
  amount: number;
  status: "Active" | "Paid" | "Overdue";
}

interface ProjectPledgesDialogProps {
  projectId: string;
  projectName: string;
}

const dummyPledges: Pledge[] = [
  { id: "p1", member: "Alice Johnson", amount: 500.00, status: "Active" },
  { id: "p2", member: "Bob Williams", amount: 250.00, status: "Overdue" },
  { id: "p3", member: "Charlie Brown", amount: 750.00, status: "Active" },
  { id: "p4", member: "Alice Johnson", amount: 100.00, status: "Paid" },
];

const ProjectPledgesDialog: React.FC<ProjectPledgesDialogProps> = ({ projectId, projectName }) => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManagePledges = currentUserPrivileges.includes("Manage Pledges");

  const [isOpen, setIsOpen] = React.useState(false);
  const [pledges, setPledges] = React.useState<Pledge[]>(dummyPledges); // Filter by projectId in real app

  React.useEffect(() => {
    if (isOpen) {
      // In a real app, fetch pledges for the specific projectId
      setPledges(dummyPledges); // Reset dummy data for demonstration
    }
  }, [isOpen, projectId]);

  const handlePayPledge = (pledgeId: string, memberName: string, amount: number) => {
    // In a real application, this would trigger a payment process
    showSuccess(`Payment initiated for ${memberName}'s pledge of $${amount.toFixed(2)}.`);
    console.log(`Initiating payment for pledge ID: ${pledgeId} for project ${projectName}`);
    // Update pledge status to 'Paid' in state (and backend)
    setPledges((prev) =>
      prev.map((p) => (p.id === pledgeId ? { ...p, status: "Paid" } : p))
    );
  };

  const handlePrint = () => {
    showSuccess("Printing pledge report (placeholder).");
    console.log("Printing pledges for project:", projectName);
    // Actual implementation would involve generating a printable view
  };

  const handleDownload = () => {
    showSuccess("Downloading pledge report (placeholder).");
    console.log("Downloading pledges for project:", projectName);
    // Actual implementation would involve generating and downloading a file (e.g., PDF, CSV)
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Pledges</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Pledges for {projectName}</DialogTitle>
          <DialogDescription>
            View and manage pledges related to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-end space-x-2 mb-4">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {canManagePledges && <TableHead className="text-center">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pledges.map((pledge) => (
                <TableRow key={pledge.id}>
                  <TableCell className="font-medium">{pledge.member}</TableCell>
                  <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{pledge.status}</TableCell>
                  {canManagePledges && (
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePayPledge(pledge.id, pledge.member, pledge.amount)}
                        disabled={pledge.status === "Paid"}
                      >
                        Pay
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Payment processing, printing, and downloading require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPledgesDialog;