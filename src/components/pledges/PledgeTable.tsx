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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Pledge } from "@/hooks/use-pledge-management"; // Import Pledge type from the hook
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface PledgeTableProps {
  pledges: Pledge[];
  members: Member[];
  projects: Project[];
  canManagePledges: boolean;
  handleMarkAsPaid: (id: string) => Promise<void>;
  handleEditPledge: (id: string) => void;
  handleDeletePledge: (id: string) => Promise<void>;
  getPledgeStatus: (pledge: Pledge) => Pledge['status'];
  getStatusBadgeClasses: (status: Pledge['status']) => BadgeVariant;
}

const PledgeTable: React.FC<PledgeTableProps> = ({
  pledges,
  members,
  projects,
  canManagePledges,
  handleMarkAsPaid,
  handleEditPledge,
  handleDeletePledge,
  getPledgeStatus,
  getStatusBadgeClasses,
}) => {
  return (
    <>
      {pledges.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pledges.map((pledge) => {
              const status = getPledgeStatus(pledge);
              const memberName = members.find(m => m.id === pledge.member_id)?.name;
              const projectName = projects.find(p => p.id === pledge.project_id)?.name;
              return (
                <TableRow key={pledge.id}>
                  <TableCell className="font-medium">{memberName}</TableCell>
                  <TableCell>{projectName}</TableCell>
                  <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeClasses(status)}>
                      {status}
                    </Badge>
                  </TableCell>
                  {canManagePledges && (
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        {status !== "Paid" && (
                          <Button variant="outline" size="icon" onClick={() => handleMarkAsPaid(pledge.id)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEditPledge(pledge.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePledge(pledge.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">No pledges found for the selected period or matching your search.</p>
      )}
    </>
  );
};

export default PledgeTable;