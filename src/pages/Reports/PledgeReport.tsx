"use client";

import React, { useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, CalendarIcon } from "lucide-react";
import { format, endOfDay, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";

type FilterStatus = "All" | "Paid" | "Unpaid" | "Active" | "Overdue";

type ProjectOption = { id: string; name: string };
type MemberOption = { id: string; name: string; email: string };

type PledgeRow = {
  id: string;
  project_id: string;
  member_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
  projects: { name: string } | null;
  profiles: { name: string | null; email: string | null } | null;
};

type PledgeReportEntry = {
  pledge_id: string;
  member_id: string;
  member_name: string;
  project_id: string;
  project_name: string;
  original_amount: number;
  paid_amount: number;
  balance_due: number;
  due_date: string;
  status: "Active" | "Paid" | "Overdue";
};

export default function PledgeReport() {
  const { currency } = useSystemSettings();

  const defaultRange = React.useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("All");
  const [projectId, setProjectId] = React.useState<string>("All");
  const [memberId, setMemberId] = React.useState<string>("All");

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 400);

  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [members, setMembers] = React.useState<MemberOption[]>([]);

  const [rows, setRows] = React.useState<PledgeReportEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const subtitle = React.useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";

    const projectName =
      projectId === "All" ? "All Projects" : projects.find((p) => p.id === projectId)?.name || "Selected Project";
    const memberName =
      memberId === "All" ? "All Members" : members.find((m) => m.id === memberId)?.name || "Selected Member";

    return `Due Date: ${fromStr} → ${toStr} • ${projectName} • ${memberName} • Status: ${filterStatus}`;
  }, [dateRange?.from, dateRange?.to, projectId, memberId, filterStatus, projects, members]);

  const fetchFilters = useCallback(async () => {
    // Projects
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .neq("status", "Deleted")
      .order("name", { ascending: true });

    if (projectError) {
      console.error("Error fetching projects for pledge report:", projectError);
    } else {
      setProjects(projectData || []);
    }

    // Members (profiles)
    const { data: memberData, error: memberError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (memberError) {
      console.error("Error fetching members for pledge report:", memberError);
    } else {
      setMembers(
        (memberData || []).map((m) => ({
          id: m.id,
          name: m.name || m.email || "Unknown",
          email: m.email || "",
        })),
      );
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = dateRange?.from ? startOfDay(dateRange.from) : null;
    const to = dateRange?.to ? endOfDay(dateRange.to) : null;

    if (!from || !to) {
      setRows([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("project_pledges")
      .select(
        "id, project_id, member_id, amount, paid_amount, due_date, status, projects(name), profiles(name,email)",
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
      query = query.neq("status", "Paid");
    } else if (filterStatus !== "All") {
      query = query.eq("status", filterStatus);
    }

    if (debouncedSearchQuery) {
      query = query.or(
        `profiles.name.ilike.%${debouncedSearchQuery}%,profiles.email.ilike.%${debouncedSearchQuery}%,projects.name.ilike.%${debouncedSearchQuery}%`,
      );
    }

    const { data, error } = (await query.order("due_date", { ascending: false })) as {
      data: PledgeRow[] | null;
      error: any;
    };

    if (error) {
      console.error("Error fetching pledge report:", error);
      setError("Failed to load pledge report.");
      showError("Failed to load pledge report.");
      setRows([]);
      setLoading(false);
      return;
    }

    const normalized: PledgeReportEntry[] = (data || []).map((p) => {
      const memberName = p.profiles?.name || p.profiles?.email || "Unknown";
      const projectName = p.projects?.name || "Unknown";
      const original = Number(p.amount || 0);
      const paid = Number(p.paid_amount || 0);
      const balance = Math.max(original - paid, 0);

      return {
        pledge_id: p.id,
        member_id: p.member_id,
        member_name: memberName,
        project_id: p.project_id,
        project_name: projectName,
        original_amount: original,
        paid_amount: paid,
        balance_due: balance,
        due_date: p.due_date,
        status: p.status,
      };
    });

    setRows(normalized);
    setLoading(false);
  }, [dateRange?.from, dateRange?.to, projectId, memberId, filterStatus, debouncedSearchQuery]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-muted-foreground">Loading pledge report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
      <p className="text-lg text-muted-foreground">
        Filter pledges by project, member, status, and due-date range.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Pledge Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <ReportActions
            title="Pledge Report"
            subtitle={subtitle}
            columns={[
              "Member",
              "Project",
              "Original",
              "Paid",
              "Balance",
              "Due Date",
              "Status",
            ]}
            rows={rows.map((r) => [
              r.member_name,
              r.project_name,
              r.original_amount.toFixed(2),
              r.paid_amount.toFixed(2),
              r.balance_due.toFixed(2),
              format(new Date(r.due_date), "MMM dd, yyyy"),
              r.status,
            ])}
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-1.5">
                <Label>Due Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-1.5">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Project</SelectLabel>
                      <SelectItem value="All">All Projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Member</SelectLabel>
                      <SelectItem value="All">All Members</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={filterStatus}
                  onValueChange={(v: FilterStatus) => setFilterStatus(v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 flex-1 min-w-[220px]">
                <Label>Search</Label>
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    placeholder="Search member/project..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.pledge_id}>
                      <TableCell className="font-medium">{r.member_name}</TableCell>
                      <TableCell>{r.project_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{r.original_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{r.paid_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{currency.symbol}{r.balance_due.toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(r.due_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            r.status === "Paid" && "text-green-600",
                            r.status === "Overdue" && "text-destructive",
                            r.status === "Active" && "text-yellow-600",
                          )}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center mt-4">
                No pledges match the selected criteria.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
