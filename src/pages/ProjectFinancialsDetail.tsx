"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useProjectFinancials } from "@/hooks/use-project-financials"; // Import the new hook and types
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
  thumbnailUrl?: string;
  dueDate?: Date;
  memberContributionAmount?: number;
  user_id: string;
}

// Use the exported types from the hook
type HookProjectPledge = ReturnType<typeof useProjectFinancials>['pledges'][0];
type HookProjectCollection = ReturnType<typeof useProjectFinancials>['collections'][0];

const getPledgeStatus = (pledge: HookProjectPledge): HookProjectPledge['status'] => {
  if (pledge.status === "Paid") return "Paid";
  const today = startOfDay(new Date());
  const dueDate = startOfDay(pledge.due_date); // Use due_date which is already a Date object
  if (isBefore(dueDate, today)) {
    return "Overdue";
  }
  return "Active";
};

const getStatusBadgeClasses = (status: HookProjectPledge['status']) => {
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
  const { currency } = useSystemSettings(); // Use currency from context
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(true);
  const [projectDetailsError, setProjectDetailsError] = useState<string | null>(null);

  const { financialSummary, loading: financialsLoading, error: financialsError, refreshFinancials } = useProjectFinancials(projectId || "");

  useEffect(() => {
    const fetchProjectDetails = async () => {
      setLoadingProjectDetails(true);
      setProjectDetailsError(null);
      if (!projectId) {
        setProjectDetailsError("Project ID is missing.");
        setLoadingProjectDetails(false);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error) {
        console.error("Error fetching project details:", error);
        setProjectDetailsError("Failed to load project details.");
        setProjectDetails(null);
      } else {
        setProjectDetails({
          id: data.id,
          name: data.name,
          description: data.description,
          status: data.status as "Open" | "Closed" | "Deleted" | "Suspended",
          thumbnailUrl: data.thumbnail_url || undefined,
          dueDate: data.due_date ? parseISO(data.due_date) : undefined,
          memberContributionAmount: data.member_contribution_amount || undefined,
          user_id: data.user_id,
        });
      }
      setLoadingProjectDetails(false);
    };
    fetchProjectDetails();
  }, [projectId]);

  if (loadingProjectDetails || financialsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Loading Project Financials...</h1>
        <p className="text-lg text-muted-foreground">Fetching project details and financial summary.</p>
      </div>
    );
  }

  if (projectDetailsError || financialsError) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Error Loading Project</h1>
        <p className="text-lg text-destructive">
          {projectDetailsError || financialsError || "An unexpected error occurred."}
        </p>
        <Link to="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Project Not Found</h1>
        <p className="text-lg text-muted-foreground">
          The project you are looking for does not exist.
        </p>
        <Link to="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const collections = financialSummary?.collections || [];
  const pledges = financialSummary?.pledges || [];
  const totalCollections = financialSummary?.totalCollections || 0;
  const totalPledged = financialSummary?.totalPledged || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Financial Details for {projectDetails.name}</h1>
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
            <div className="text-2xl font-bold">{currency.symbol}{totalCollections.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">{currency.symbol}{totalPledged.toFixed(2)}</div>
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
            <DollarSign className="h-5 w-5" />
            Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length > 0 ? (
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
                {collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>{format(collection.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{collection.member_name}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{collection.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{collection.payment_method.replace(/-/g, " ")}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={2}>Total Collections</TableCell>
                  <TableCell className="text-right">{currency.symbol}{totalCollections.toFixed(2)}</TableCell>
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
            <Handshake className="h-5 w-5" />
            Pledges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pledges.length > 0 ? (
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
                {pledges.map((pledge) => {
                  const status = getPledgeStatus(pledge);
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell>{pledge.member_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{pledge.amount.toFixed(2)}</TableCell>
                      <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
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
                  <TableCell className="text-right">{currency.symbol}{totalPledged.toFixed(2)}</TableCell>
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