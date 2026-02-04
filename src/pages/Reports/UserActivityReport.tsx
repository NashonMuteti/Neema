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
import { Search } from "lucide-react";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";

interface UserActivityLogRow {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any> | null;
  timestamp: string; // ISO
}

function formatValue(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return Number.isFinite(v) ? v.toString() : String(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (s.length <= 60) return s;
    return `${s.slice(0, 57)}...`;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "(empty)";
    return `[${v.length} items]`;
  }
  if (typeof v === "object") {
    if ("id" in v && typeof v.id === "string") return `id=${v.id}`;
    return "[object]";
  }
  return String(v);
}

function pickInterestingFields(obj: Record<string, any>) {
  const candidates = [
    "key",
    "name",
    "email",
    "status",
    "role",
    "amount",
    "paid_amount",
    "current_balance",
    "initial_balance",
    "project_id",
    "member_id",
    "account_id",
    "date",
    "due_date",
    "source",
    "purpose",
    "description",
  ];

  const out: Array<[string, any]> = [];
  for (const k of candidates) {
    if (k in obj) out.push([k, obj[k]]);
    if (out.length >= 5) break;
  }

  if (out.length === 0) {
    // fallback: show up to 4 primitive fields
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null) {
        out.push([k, v]);
      }
      if (out.length >= 4) break;
    }
  }

  return out;
}

function summarizeAuditDetails(details: Record<string, any> | null) {
  if (!details || typeof details !== "object") return "-";

  // Our audit trigger writes: { table, op, old?, new? }
  const table = details.table as string | undefined;
  const op = details.op as string | undefined;
  const oldRow = (details.old && typeof details.old === "object") ? (details.old as Record<string, any>) : null;
  const newRow = (details.new && typeof details.new === "object") ? (details.new as Record<string, any>) : null;

  if (!table || !op) {
    // Not an audit payload (legacy/custom log)
    try {
      const pairs = pickInterestingFields(details)
        .map(([k, v]) => `${k}: ${formatValue(v)}`)
        .join(" • ");
      return pairs || "-";
    } catch {
      return "-";
    }
  }

  const tableLabel =
    table === "settings"
      ? "System settings"
      : table === "profiles"
        ? "User profiles"
        : table === "financial_accounts"
          ? "Financial accounts"
          : table.replace(/_/g, " ");

  // Special-case settings to show key/value changes clearly
  if (table === "settings") {
    const key = (newRow?.key ?? oldRow?.key) as string | undefined;
    const from = oldRow?.value;
    const to = newRow?.value;

    if (op === "UPDATE" && key) {
      return `Changed setting "${key}" from "${formatValue(from)}" to "${formatValue(to)}".`;
    }
    if (op === "INSERT" && key) {
      return `Set setting "${key}" to "${formatValue(to)}".`;
    }
    if (op === "DELETE" && key) {
      return `Removed setting "${key}".`;
    }
  }

  // UPDATE: show changed fields only (shallow)
  if (op === "UPDATE" && oldRow && newRow) {
    const ignore = new Set(["created_at", "updated_at", "timestamp"]);
    const keys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);

    const changes: Array<{ k: string; from: any; to: any }> = [];
    for (const k of keys) {
      if (ignore.has(k)) continue;
      const from = oldRow[k];
      const to = newRow[k];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        changes.push({ k, from, to });
      }
    }

    if (changes.length === 0) return `Updated ${tableLabel}.`;

    const shown = changes.slice(0, 4);
    const rest = changes.length - shown.length;

    const changedText = shown
      .map((c) => `${c.k}: ${formatValue(c.from)} → ${formatValue(c.to)}`)
      .join("; ");

    return `Updated ${tableLabel}: ${changedText}${rest > 0 ? ` (+${rest} more)` : ""}.`;
  }

  // INSERT/DELETE: show a compact identifier
  const base = op === "INSERT" ? `Created in ${tableLabel}` : op === "DELETE" ? `Deleted from ${tableLabel}` : `${op} ${tableLabel}`;
  const sample = (newRow || oldRow) as Record<string, any> | null;
  if (!sample) return `${base}.`;

  const parts = pickInterestingFields(sample)
    .map(([k, v]) => `${k}: ${formatValue(v)}`)
    .join(" • ");

  return parts ? `${base} (${parts}).` : `${base}.`;
}

const UserActivityReport = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [filterUserId, setFilterUserId] = React.useState<string>("All");

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);

  const [users, setUsers] = React.useState<{ id: string; name: string; email?: string }[]>([]);
  const [activityLogs, setActivityLogs] = React.useState<UserActivityLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const userLabelById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      map.set(u.id, u.name || u.email || u.id);
    }
    if (currentUser) {
      map.set(currentUser.id, currentUser.name || currentUser.email || currentUser.id);
    }
    return map;
  }, [users, currentUser]);

  React.useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name", { ascending: true });

      if (!error) {
        setUsers(
          (data || []).map((p) => ({
            id: p.id,
            name: p.name || p.email || "Unknown",
            email: p.email || undefined,
          })),
        );
      }
    };

    loadUsers();
  }, [isAdmin]);

  const fetchActivityLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Use UTC boundaries to avoid timezone edge-case gaps.
    const y = parseInt(filterYear);
    const m = parseInt(filterMonth);
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const endExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));

    let query = supabase
      .from("user_activity_logs")
      .select("id, user_id, action, details, timestamp")
      .gte("timestamp", start.toISOString())
      .lt("timestamp", endExclusive.toISOString());

    if (isAdmin && filterUserId !== "All") {
      query = query.eq("user_id", filterUserId);
    }

    const { data, error } = await query.order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching user activity logs:", error);
      setError("Failed to load user activity logs.");
      showError("Failed to load user activity logs.");
      setActivityLogs([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as UserActivityLogRow[];

    // Client-side search to ensure we don't accidentally exclude rows via server-side ORs.
    const q = debouncedSearchQuery.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => {
          const userLabel = r.user_id ? userLabelById.get(r.user_id) || "" : "";
          const haystack = [
            userLabel,
            r.user_id || "",
            r.action || "",
            r.details ? JSON.stringify(r.details) : "",
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        })
      : rows;

    setActivityLogs(filtered);
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, debouncedSearchQuery, isAdmin, filterUserId, userLabelById]);

  React.useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Activity Report</h1>
        <p className="text-lg text-muted-foreground">Loading user activity logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Activity Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  const subtitle =
    `Period: ${months.find((m) => m.value === filterMonth)?.label} ${filterYear}` +
    (isAdmin && filterUserId !== "All"
      ? ` • User: ${users.find((u) => u.id === filterUserId)?.name || "Selected"}`
      : "") +
    (debouncedSearchQuery ? ` • Search: ${debouncedSearchQuery}` : "");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">User Activity Report</h1>
      <p className="text-lg text-muted-foreground">Track and review user actions within the application.</p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <ReportActions
            title="User Activity Report"
            subtitle={subtitle}
            columns={["User", "Action", "Timestamp", "Details"]}
            rows={activityLogs.map((a) => [
              a.user_id ? userLabelById.get(a.user_id) || a.user_id : "System",
              a.action,
              format(parseISO(a.timestamp), "MMM dd, yyyy hh:mm a"),
              summarizeAuditDetails(a.details),
            ])}
          />
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month" className="w-[140px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Month</SelectLabel>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="filter-year" className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Year</SelectLabel>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="filter-user">User</Label>
                  <Select value={filterUserId} onValueChange={setFilterUserId}>
                    <SelectTrigger id="filter-user" className="w-[220px]">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>User</SelectLabel>
                        <SelectItem value="All">All Users</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search user, action, details..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {activityLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      {activity.user_id ? userLabelById.get(activity.user_id) || activity.user_id : "System"}
                    </TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{format(parseISO(activity.timestamp), "MMM dd, yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[520px]">
                      {summarizeAuditDetails(activity.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No user activity found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityReport;