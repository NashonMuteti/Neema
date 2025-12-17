"use client";

import React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, DollarSign, Handshake } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useProjectFinancials } from "@/hooks/use-project-financials"; // Import the new hook

// Dummy data for projects (to get project name)
const dummyProjects = [
  { id: "proj1", name: "Film Production X", description: "Main film project for the year.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 11, 15), memberContributionAmount: 100 },
  { id: "proj2", name: "Marketing Campaign Y", description: "Promotional activities for new releases.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 7, 30), memberContributionAmount: 50 },
  { id: "proj3", name: "Post-Production Z", description: "Editing and final touches for upcoming film.", status: "Closed", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 8, 10), memberContributionAmount: 75 },
  { id: "proj5", name: "Short Film Contest", description: "Submission for a local short film festival.", status: "Open", thumbnailUrl: "/placeholder.svg", dueDate: new Date(2024, 6, 20), memberContributionAmount: 20 },
];

// Dummy data for members (to get member name)
const dummyMembers = [
  { id: "m1", name: "Alice Johnson" },
  { id: "m2", name: "Bob Williams" },
  { id: "m3", name: "Charlie Brown" },
];

// Dummy data for project collections
const allProjectCollections = [
  { id: "col1", projectId: "proj1", memberId: "m1", amount: 50, date: "2024-07-10", paymentMethod: "cash" },
  { id: "col2", projectId: "proj1", memberId: "m3", amount: 25, date: "2024-07-12", paymentMethod: "bank-transfer" },
  { id: "col3", projectId: "proj5", memberId: "m1", amount: 20, date: "2024-07-15", paymentMethod: "cash" },
  { id: "col4", projectId: "proj2", memberId: "m2", amount: 50, date: "2024-08-01", paymentMethod: "online-payment" },
  { id: "col5", projectId: "proj1", memberId: "m1", amount: 50, date: "2024-08-05", paymentMethod: "cash" },
];

interface Pledge {
  id: string;
  memberId: string;
  projectId: string;
  amount: number;
  dueDate: string; // ISO string
  status: "Active" | "Paid" | "Overdue";
}

// Dummy data for project pledges - explicitly typed
const allProjectPledges: Pledge[] = [
  { id: "p1", projectId: "proj1", memberId: "m1", amount: 500, dueDate: "2024-07-15", status: "Active" },
  { id: "p2", projectId: "proj2", memberId: "m2", amount: 250, dueDate: "2024-05-01", status: "Overdue" },
  { id: "p3", projectId: "proj1", memberId: "m3", amount: 750, dueDate: "2024-08-10", status: "Active" },
  { id: "p4", projectId: "proj3", memberId: "m1", amount: 100, dueDate: "2024-04-20", status: "Paid" },
  { id: "p5", projectId: "proj5", memberId: "m2", amount: 150, dueDate: "2024-07-25", status: "Active" },
];

const getPledgeStatus = (pledge: Pledge): Pledge['status'] => {
  if (pledge.status === "Paid") return "Paid";
  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(pledge.dueDate));
  if (isBefore(dueDate, today)) {
    return "Overdue";
  }
  return "Active";
};

const getStatusBadgeClasses = (status: Pledge['status']) => {
  switch (status) {
    case "Active":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "Paid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const ProjectFinancialsDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const project = dummyProjects.find(p => p.id === projectId);

  const { financialSummary, loading: financialsLoading, error: financialsError } = useProjectFinancials(projectId || ""); // Use the hook
  const totalCollections = financialSummary?.totalCollections || 0;
  const totalPledges = financialSummary?.totalPledges || 0;

  if (!project) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Project Not Found</h1>
        <p className="text-lg text-muted-foreground">
          The project you are looking for does not exist.
        </p>
        <Link to="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const projectCollections = allProjectCollections.filter(c => c.projectId === projectId);
  const projectPledges = allProjectPledges.filter(p => p.projectId === projectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Financial Details for {project.name}</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Overview of all collections and pledges related to this project.
      </p>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCollections.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All recorded contributions for this project.
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPledges.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total outstanding and paid pledges.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collections Section */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectCollections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>{format(parseISO(collection.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{dummyMembers.find(m => m.id === collection.memberId)?.name}</TableCell>
                    <TableCell className="text-right">${collection.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{collection.paymentMethod.replace(/-/g, " ")}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={2}>Total Collections</TableCell>
                  <TableCell className="text-right">${totalCollections.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No collections recorded for this project yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Pledges Section */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" /> Pledges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectPledges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPledges.map((pledge) => {
                  const status = getPledgeStatus(pledge);
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell>{dummyMembers.find(m => m.id === pledge.memberId)?.name}</TableCell>
                      <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                      <TableCell>{format(parseISO(pledge.dueDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={1}>Total Pledges</TableCell>
                  <TableCell className="text-right">${totalPledges.toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No pledges recorded for this project yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFinancialsDetail;