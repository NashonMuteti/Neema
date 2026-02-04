"use client";

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as XLSX from "xlsx";
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
import { ArrowLeft, DollarSign, FileSpreadsheet, Handshake, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useProjectFinancials } from "@/hooks/use-project-financials";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { exportTableToPdf } from "@/utils/reportUtils";
import { showError } from "@/utils/toast";
import { FinancialAccount } from "@/types/common";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Open" | "Closed" | "Deleted" | "Suspended";
  thumbnailUrl?: string;
  dueDate?: Date;
  memberContributionAmount?: number;
  profile_id: string;
}

type HookProjectPledge = ReturnType<typeof useProjectFinancials>["pledges"][0];
type HookProjectCollection = ReturnType<typeof useProjectFinancials>["collections"][0];

const getDisplayPledgeStatus = (pledge: HookProjectPledge): "Paid" | "Unpaid" => {
  if (pledge.paid_amount >= pledge.original_amount) return "Paid";
  return "Unpaid";
};

const getStatusBadgeClasses = (displayStatus: "Paid" | "Unpaid") => {
  switch (displayStatus) {
    case "Paid":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Unpaid":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const ProjectFinancialsDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currency } = useSystemSettings();
  const { currentUser } = useAuth();
  const { brandLogoUrl, tagline } = useBranding();

  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(true);
  const [projectDetailsError, setProjectDetailsError] = useState<string | null>(null);

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const { financialSummary, loading: financialsLoading, error: financialsError } = useProjectFinancials(
    projectId || "",
  );

  useEffect(() => {
    const fetchProjectDetails = async () => {
      setLoadingProjectDetails(true);
      setProjectDetailsError(null);
      if (!projectId) {
        setProjectDetailsError("Project ID is missing.");
        setLoadingProjectDetails(false);
        return;
      }
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
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
          profile_id: data.profile_id,
        });
      }
      setLoadingProjectDetails(false);
    };

    const fetchFinancialAccounts = async () => {
      setLoadingAccounts(true);
      if (!currentUser) {
        setLoadingAccounts(false);
        return;
      }
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
        .eq("profile_id", currentUser.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching financial accounts:", error);
        showError("Failed to load financial accounts.");
        setFinancialAccounts([]);
      } else {
        setFinancialAccounts(data || []);
      }
      setLoadingAccounts(false);
    };

    fetchProjectDetails();
    fetchFinancialAccounts();
  }, [projectId, currentUser]);

  if (loadingProjectDetails || financialsLoading || loadingAccounts) {
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
        <p className="text-lg text-muted-foreground">The project you are looking for does not exist.</p>
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
  const expectedPerMember = projectDetails.memberContributionAmount || 0;

  const accountNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    financialAccounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [financialAccounts]);

  const totalPaidByMemberId = React.useMemo(() => {
    const map = new Map<string, number>();

    for (const c of collections) {
      map.set(c.member_id, (map.get(c.member_id) || 0) + c.amount);
    }

    for (const p of pledges) {
      map.set(p.member_id, (map.get(p.member_id) || 0) + (p.paid_amount || 0));
    }

    return map;
  }, [collections, pledges]);

  const handleExportExcel = () => {
    const data = collections.map((c) => {
      const receivingAccount =
        c.receiving_account_name ||
        (c.receiving_account_id ? accountNameById.get(c.receiving_account_id) : "") ||
        "";

      return {
        Date: format(c.date, "yyyy-MM-dd"),
        Member: c.member_name,
        Expected: expectedPerMember,
        Amount: c.amount,
        "Total Paid": totalPaidByMemberId.get(c.member_id) || 0,
        "Receiving Account": receivingAccount,
      };
    });

    data.push({
      Date: "",
      Member: "TOTAL",
      Expected: "",
      Amount: totalCollections,
      "Total Paid": "",
      "Receiving Account": "",
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");

    const safeProject = projectDetails.name.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `Project_Financials_${safeProject}.xlsx`);
  };

  const handlePrintPdf = async () => {
    const rows: Array<Array<string | number>> = collections.map((c) => {
      const receivingAccount =
        c.receiving_account_name ||
        (c.receiving_account_id ? accountNameById.get(c.receiving_account_id) : "") ||
        "";

      return [
        format(c.date, "yyyy-MM-dd"),
        c.member_name,
        `${currency.symbol}${expectedPerMember.toFixed(2)}`,
        `${currency.symbol}${c.amount.toFixed(2)}`,
        `${currency.symbol}${(totalPaidByMemberId.get(c.member_id) || 0).toFixed(2)}`,
        receivingAccount,
      ];
    });

    rows.push([
      "",
      "TOTAL",
      "",
      `${currency.symbol}${totalCollections.toFixed(2)}`,
      "",
      "",
    ]);

    await exportTableToPdf({
      title: `Project Financials: ${projectDetails.name}`,
      subtitle: "Collections",
      fileName: `Project_Financials_${projectDetails.name}`,
      columns: ["Date", "Member", "Expected", "Amount", "Total Paid", "Receiving Account"],
      rows,
      brandLogoUrl,
      tagline,
      mode: "open",
      orientation: "auto",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financial Details for {projectDetails.name}</h1>
            <p className="text-sm text-muted-foreground">Overview of all collections and pledges related to this project.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handlePrintPdf}>
            <Printer className="mr-2 h-4 w-4" /> Print (PDF)
          </Button>
          <Button onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currency.symbol}
              {totalCollections.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All recorded contributions for this project.</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currency.symbol}
              {totalPledged.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total outstanding and paid pledges.</p>
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
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead>Receiving Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => {
                  const receivingAccount =
                    collection.receiving_account_name ||
                    (collection.receiving_account_id
                      ? accountNameById.get(collection.receiving_account_id)
                      : "") ||
                    "-";

                  return (
                    <TableRow key={collection.id}>
                      <TableCell>{format(collection.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{collection.member_name}</TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {expectedPerMember.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {collection.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {(totalPaidByMemberId.get(collection.member_id) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{receivingAccount}</TableCell>
                    </TableRow>
                  );
                })}

                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={3}>Total Collections</TableCell>
                  <TableCell className="text-right">
                    {currency.symbol}
                    {totalCollections.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2} />
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
                  <TableHead className="text-right">Pledged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pledges.map((pledge) => {
                  const displayStatus = getDisplayPledgeStatus(pledge);
                  const remaining = pledge.original_amount - pledge.paid_amount;
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell>{pledge.member_name}</TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {pledge.original_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {pledge.paid_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {remaining.toFixed(2)}
                      </TableCell>
                      <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(displayStatus)}>{displayStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={1}>Total Pledges</TableCell>
                  <TableCell className="text-right">
                    {currency.symbol}
                    {totalPledged.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
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