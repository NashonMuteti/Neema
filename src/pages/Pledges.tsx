"use client";

import React, { useCallback, useMemo } from "react";
import { endOfDay, format, startOfDay, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import PledgeForm from "@/components/pledges/PledgeForm";
import PledgeFilters, { PledgeStatusFilter } from "@/components/pledges/PledgeFilters";
import PledgeListTable from "@/components/pledges/PledgeListTable";
import { Pledge as EditPledgeDialogPledge } from "@/components/pledges/EditPledgeDialog";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Member, FinancialAccount, Pledge } from "@/types/common";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";

interface Project {
  id: string;
  name: string;
}

interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string; email: string } | null;
  projects: { name: string } | null;
  comments?: string;
}

const Pledges = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find((role) => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  const defaultRange = useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  const [filterStatus, setFilterStatus] = React.useState<PledgeStatusFilter>("All");
  const [projectId, setProjectId] = React.useState<string>("All");
  const [memberId, setMemberId] = React.useState<string>("All");

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 400);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: membersData, error: membersError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .order("name", { ascending: true });

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: accountsData, error: accountsError } = await supabase
      .from("financial_accounts")
      .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
      .order("name", { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);
    }

    if (membersError) {
      console.error("Error fetching members:", membersError);
      setError("Failed to load members.");
    } else {
      setMembers(membersData || []);
    }

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      setError("Failed to load projects.");
    } else {
      const uniqueProjects = Array.from(new Map((projectsData || []).map((p) => [p.id, p])).values());
      setProjects(uniqueProjects);
    }

    const from = dateRange?.from ? startOfDay(dateRange.from) : null;
    const to = dateRange?.to ? endOfDay(dateRange.to) : null;

    if (!from || !to) {
      setPledges([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("project_pledges")
      .select(
        `
        id,
        member_id,
        project_id,
        amount,
        paid_amount,
        due_date,
        status,
        comments,
        profiles ( name, email ),
        projects ( name )
      `,
      )
      .gte("due_date", from.toISOString())
      .lte("due_date", to.toISOString());

    if (projectId !== "All") {
      query = query.eq("project_id", projectId);
    }

    if (memberId !== "All") {
      query = query.eq("member_id", memberId);
    }

    if (filterStatus === "Paid") {
      query = query.eq("status", "Paid");
    } else if (filterStatus === "Unpaid") {
      query = query.in("status", ["Active", "Overdue"]);
    } else if (filterStatus === "Overdue") {
      query = query.eq("status", "Overdue");
    }

    const { data: pledgesData, error: pledgesError } =
      (await query.order("due_date", { ascending: false })) as {
        data: PledgeRowWithJoinedData[] | null;
        error: PostgrestError | null;
      };

    if (pledgesError) {
      console.error("Error fetching pledges:", pledgesError);
      setError("Failed to load pledges.");
      setPledges([]);
      setLoading(false);
      return;
    }

    const fetchedPledges: Pledge[] = (pledgesData || []).map((p) => ({
      id: p.id,
      member_id: p.member_id,
      project_id: p.project_id,
      original_amount: p.amount,
      paid_amount: p.paid_amount,
      due_date: parseISO(p.due_date),
      status: p.status === "Paid" ? "Paid" : "Active",
      member_name: p.profiles?.name || p.profiles?.email || "Unknown Member",
      project_name: p.projects?.name || "Unknown Project",
      comments: p.comments || undefined,
    }));

    const q = debouncedSearchQuery.trim().toLowerCase();
    const filtered = q
      ? fetchedPledges.filter((pledge) => {
          return (
            (pledge.member_name || "").toLowerCase().includes(q) ||
            (pledge.project_name || "").toLowerCase().includes(q) ||
            (pledge.comments || "").toLowerCase().includes(q)
          );
        })
      : fetchedPledges;

    // Keep unpaid first, then latest due date
    const sorted = filtered.sort((a, b) => {
      const aPaid = a.paid_amount >= a.original_amount;
      const bPaid = b.paid_amount >= b.original_amount;

      if (!aPaid && bPaid) return -1;
      if (aPaid && !bPaid) return 1;

      return b.due_date.getTime() - a.due_date.getTime();
    });

    setPledges(sorted);
    setLoading(false);
  }, [dateRange?.from, dateRange?.to, projectId, memberId, filterStatus, debouncedSearchQuery]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
    queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardProjects"] });
    queryClient.invalidateQueries({ queryKey: ["contributionsProgress"] });
  };

  const handleRecordPledge = async (pledgeData: {
    member_id: string;
    project_id: string;
    amount: number;
    due_date: Date;
    comments?: string;
  }) => {
    if (!currentUser) {
      showError("You must be logged in to record a pledge.");
      return;
    }

    const { error: insertError } = await supabase.from("project_pledges").insert({
      member_id: pledgeData.member_id,
      project_id: pledgeData.project_id,
      amount: pledgeData.amount,
      paid_amount: 0,
      due_date: pledgeData.due_date.toISOString(),
      status: "Active",
      comments: pledgeData.comments,
    });

    if (insertError) {
      console.error("Error recording pledge:", insertError);
      showError("Failed to record pledge.");
      return;
    }

    showSuccess("Pledge recorded successfully!");
    fetchInitialData();
    invalidateDashboardQueries();
  };

  const handleEditPledge = (_updatedPledge: EditPledgeDialogPledge) => {
    fetchInitialData();
    invalidateDashboardQueries();
  };

  const handleDeletePledge = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to delete pledges.");
      return;
    }

    const { error: deleteError } = await supabase.from("project_pledges").delete().eq("id", id);

    if (deleteError) {
      console.error("Error deleting pledge:", deleteError);
      showError("Failed to delete pledge.");
      return;
    }

    showSuccess("Pledge deleted successfully!");
    fetchInitialData();
    invalidateDashboardQueries();
  };

  const handleMarkAsPaid = async (
    pledgeId: string,
    amountPaid: number,
    receivedIntoAccountId: string,
    paymentDate: Date,
  ) => {
    if (!currentUser) {
      showError("You must be logged in to record a pledge payment.");
      return;
    }

    const { error: rpcError } = await supabase.rpc("record_pledge_payment_atomic", {
      p_pledge_id: pledgeId,
      p_amount_paid: amountPaid,
      p_payment_date: paymentDate.toISOString(),
      p_received_into_account_id: receivedIntoAccountId,
      p_actor_profile_id: currentUser.id,
    });

    if (rpcError) {
      console.error("Error recording pledge payment:", rpcError);
      showError(`Failed to record pledge payment: ${rpcError.message}`);
    } else {
      showSuccess(`Pledge payment of ${currency.symbol}${amountPaid.toFixed(2)} recorded successfully!`);
      fetchInitialData();
      invalidateDashboardQueries();
    }
  };

  const pledgeTotals = useMemo(() => {
    return pledges.reduce(
      (acc, p) => {
        acc.pledged += Number(p.original_amount || 0);
        acc.paid += Number(p.paid_amount || 0);
        acc.remaining += Math.max(Number(p.original_amount || 0) - Number(p.paid_amount || 0), 0);
        return acc;
      },
      { pledged: 0, paid: 0, remaining: 0 },
    );
  }, [pledges]);

  const reportSubtitle = useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";
    const projectName = projectId === "All" ? "All Projects" : projects.find((p) => p.id === projectId)?.name || "Project";
    const memberName = memberId === "All" ? "All Members" : members.find((m) => m.id === memberId)?.name || "Member";
    return `Due date: ${fromStr} → ${toStr} • ${projectName} • ${memberName} • Status: ${filterStatus}`;
  }, [dateRange?.from, dateRange?.to, projectId, memberId, filterStatus, projects, members]);

  const reportRows = useMemo(() => {
    const base = pledges.map((p) => {
      const remaining = Math.max(p.original_amount - p.paid_amount, 0);
      const status = p.paid_amount >= p.original_amount ? "Paid" : "Unpaid";
      return [
        p.member_name,
        p.project_name,
        format(p.due_date, "MMM dd, yyyy"),
        status,
        `${currency.symbol}${p.original_amount.toFixed(2)}`,
        `${currency.symbol}${p.paid_amount.toFixed(2)}`,
        `${currency.symbol}${remaining.toFixed(2)}`,
      ];
    });

    return [
      ...base,
      [
        "TOTAL",
        "",
        "",
        "",
        `${currency.symbol}${pledgeTotals.pledged.toFixed(2)}`,
        `${currency.symbol}${pledgeTotals.paid.toFixed(2)}`,
        `${currency.symbol}${pledgeTotals.remaining.toFixed(2)}`,
      ],
    ];
  }, [pledges, currency.symbol, pledgeTotals]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-muted-foreground">Loading pledges data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
      <p className="text-lg text-muted-foreground">
        Record and track financial commitments (pledges) from members for various projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PledgeForm members={members} projects={projects} onRecordPledge={handleRecordPledge} canManagePledges={canManagePledges} />

        <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Pledges</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{reportSubtitle}</p>
            </div>
            <ReportActions
              title="Pledges"
              subtitle={reportSubtitle}
              columns={["Member", "Project", "Due Date", "Status", "Pledged", "Paid", "Remaining"]}
              rows={reportRows}
              fileName={`Pledges_${format(new Date(), "yyyy-MM-dd")}`}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <PledgeFilters
              dateRange={dateRange}
              setDateRange={setDateRange}
              status={filterStatus}
              setStatus={setFilterStatus}
              projectId={projectId}
              setProjectId={setProjectId}
              memberId={memberId}
              setMemberId={setMemberId}
              projects={projects}
              members={members}
              searchQuery={localSearchQuery}
              setSearchQuery={setLocalSearchQuery}
            />

            <PledgeListTable
              pledges={pledges}
              canManagePledges={canManagePledges}
              onMarkAsPaid={handleMarkAsPaid}
              onEditPledge={handleEditPledge}
              onDeletePledge={handleDeletePledge}
              financialAccounts={financialAccounts}
              currency={currency}
              isProcessing={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;