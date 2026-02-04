"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import { useProjectFinancials } from "@/hooks/use-project-financials";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { exportMultiTableToPdf } from "@/utils/reportUtils";
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

function formatMoney(currencySymbol: string, value: number) {
  return `${currencySymbol}${value.toFixed(2)}`;
}

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

  // Keep hook order stable
  const collections = financialSummary?.collections || [];
  const pledges = financialSummary?.pledges || [];
  const totalCollections = financialSummary?.totalCollections || 0;
  const totalPledged = financialSummary?.totalPledged || 0;
  const expectedPerMember = projectDetails?.memberContributionAmount || 0;

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    financialAccounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [financialAccounts]);

  const totalPaidByMemberId = useMemo(() => {
    const map = new Map<string, number>();

    for (const c of collections) {
      map.set(c.member_id, (map.get(c.member_id) || 0) + c.amount);
    }

    for (const p of pledges) {
      map.set(p.member_id, (map.get(p.member_id) || 0) + (p.paid_amount || 0));
    }

    return map;
  }, [collections, pledges]);

  const collectionsSorted = useMemo(() => {
    const copy = [...collections];
    copy.sort((a, b) => {
      const nameCmp = (a.member_name || "").localeCompare(b.member_name || "");
      if (nameCmp !== 0) return nameCmp;
      return a.date.getTime() - b.date.getTime();
    });
    return copy;
  }, [collections]);

  const memberGroups = useMemo(() => {
    const groups: Array<{ member_id: string; member_name: string; rows: HookProjectCollection[] }> = [];
    const byId = new Map<string, { member_id: string; member_name: string; rows: HookProjectCollection[] }>();

    for (const c of collectionsSorted) {
      const existing = byId.get(c.member_id);
      if (existing) {
        existing.rows.push(c);
      } else {
        const group = { member_id: c.member_id, member_name: c.member_name, rows: [c] };
        byId.set(c.member_id, group);
        groups.push(group);
      }
    }

    // Already in A-Z order due to collectionsSorted, but keep deterministic
    groups.sort((a, b) => a.member_name.localeCompare(b.member_name));
    return groups;
  }, [collectionsSorted]);

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

  const handleExportExcel = () => {
    const data = collectionsSorted.map((c) => {
      const receivingAccount =
        c.receiving_account_name ||
        (c.receiving_account_id ? accountNameById.get(c.receiving_account_id) : "") ||
        "";

      return {
        Date: format(c.date, "yyyy-MM-dd"),
        Member: c.member_name,
        Amount: c.amount,
        "Receiving Account": receivingAccount,
      };
    });

    data.push({
      Date: "",
      Member: "GRAND TOTAL",
      Amount: totalCollections,
      "Receiving Account": "",
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");

    const safeProject = projectDetails.name.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `Project_Financials_${safeProject}.xlsx`);
  };

  const handlePrintPdf = async () => {
    const collectionsRows: Array<Array<string | number>> = collectionsSorted.map((c) => {
      const receivingAccount =
        c.receiving_account_name ||
        (c.receiving_account_id ? accountNameById.get(c.receiving_account_id) : "") ||
        "";

      return [
        format(c.date, "yyyy-MM-dd"),
        c.member_name,
        formatMoney(currency.symbol, c.amount),
        receivingAccount,
      ];
    });

    const memberTotalsRows: Array<Array<string | number>> = memberGroups.map((g) => {
      const paid = totalPaidByMemberId.get(g.member_id) || 0;
      const expected = expectedPerMember;
      const balance = expected - paid;
      const status = expected <= 0 ? "—" : balance <= 0 ? "Cleared" : "Due";

      return [
        g.member_name,
        formatMoney(currency.symbol, expected),
        formatMoney(currency.symbol, paid),
        formatMoney(currency.symbol, Math.abs(balance)),
        status,
      ];
    });

    // Grand total row (vivid)
    memberTotalsRows.push([
      "GRAND TOTAL",
      formatMoney(currency.symbol, expectedTotalForShownMembers),
      formatMoney(currency.symbol, totalCollections),
      formatMoney(currency.symbol, Math.max(expectedTotalForShownMembers - totalCollections, 0)),
      expectedTotalForShownMembers > 0 && totalCollections >= expectedTotalForShownMembers ? "Cleared" : "Due",
    ]);

    const pledgesRows: Array<Array<string | number>> = pledges
      .slice()
      .sort((a, b) => (a.member_name || "").localeCompare(b.member_name || ""))
      .map((p) => {
        const remaining = p.original_amount - p.paid_amount;
        return [
          p.member_name,
          formatMoney(currency.symbol, p.original_amount),
          formatMoney(currency.symbol, p.paid_amount),
          formatMoney(currency.symbol, remaining),
          format(p.due_date, "yyyy-MM-dd"),
          getDisplayPledgeStatus(p),
        ];
      });

    // Totals for pledges
    if (pledgesRows.length > 0) {
      const totalPaid = pledges.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
      pledgesRows.push([
        "TOTAL",
        formatMoney(currency.symbol, totalPledged),
        formatMoney(currency.symbol, totalPaid),
        formatMoney(currency.symbol, Math.max(totalPledged - totalPaid, 0)),
        "",
        "",
      ]);
    }

    await exportMultiTableToPdf({
      title: `Project Financials: ${projectDetails.name}`,
      subtitle: `Expected per member: ${formatMoney(currency.symbol, expectedPerMember)}`,
      fileName: `Project_Financials_${projectDetails.name}`,
      brandLogoUrl,
      tagline,
      mode: "open",
      orientation: "auto",
      tables: [
        {
          title: "Collections",
          columns: ["Date", "Member", "Amount", "Receiving Account"],
          rows: collectionsRows,
        },
        {
          title: "Subtotals by Member (Paid vs Expected)",
          columns: ["Member", "Expected", "Paid", "Balance", "Status"],
          rows: memberTotalsRows,
        },
        {
          title: "Pledges",
          columns: ["Member", "Pledged", "Paid", "Remaining", "Due Date", "Status"],
          rows: pledgesRows.length > 0 ? pledgesRows : [["(no pledges)", "", "", "", "", ""]],
        },
      ],
    });
  };

  const memberCountInCollections = memberGroups.length;
  const expectedTotalForShownMembers = expectedPerMember * memberCountInCollections;

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
            <p className="text-sm text-muted-foreground">
              Overview of all collections and pledges related to this project.
            </p>
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
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Collections
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
              Expected per member: {formatMoney(currency.symbol, expectedPerMember)}
            </Badge>
            <Badge variant="secondary">Members shown: {memberCountInCollections}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {collectionsSorted.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receiving Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberGroups.map((g) => {
                  const totalPaid = totalPaidByMemberId.get(g.member_id) || 0;
                  const balance = expectedPerMember - totalPaid;
                  const met = totalPaid >= expectedPerMember && expectedPerMember > 0;

                  return (
                    <React.Fragment key={g.member_id}>
                      {g.rows.map((collection) => {
                        const receivingAccount =
                          collection.receiving_account_name ||
                          (collection.receiving_account_id
                            ? accountNameById.get(collection.receiving_account_id)
                            : "") ||
                          "-";

                        return (
                          <TableRow key={collection.id}>
                            <TableCell>{format(collection.date, "MMM dd, yyyy")}</TableCell>
                            <TableCell className="font-medium">{collection.member_name}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {currency.symbol}
                              {collection.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{receivingAccount}</TableCell>
                          </TableRow>
                        );
                      })}

                      <TableRow
                        className={
                          met
                            ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                            : "bg-rose-50/80 dark:bg-rose-950/30"
                        }
                      >
                        <TableCell colSpan={4}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-extrabold">
                              SUBTOTAL — {g.member_name}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={met ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                                Paid: {formatMoney(currency.symbol, totalPaid)}
                              </Badge>
                              <Badge variant="secondary" className="font-bold">
                                Expected: {formatMoney(currency.symbol, expectedPerMember)}
                              </Badge>
                              <Badge
                                className={
                                  balance <= 0
                                    ? "bg-emerald-700 text-white"
                                    : "bg-amber-600 text-white"
                                }
                              >
                                Balance: {formatMoney(currency.symbol, Math.abs(balance))}{" "}
                                {balance <= 0 ? "(over/cleared)" : "(due)"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}

                <TableRow className="bg-gradient-to-r from-primary/15 via-muted/40 to-primary/15">
                  <TableCell colSpan={4}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-lg font-extrabold text-primary">GRAND TOTAL</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                          Collected: {formatMoney(currency.symbol, totalCollections)}
                        </Badge>
                        <Badge variant="secondary" className="font-bold">
                          Expected (shown members): {formatMoney(currency.symbol, expectedTotalForShownMembers)}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
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