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
import { JoinedProfile } from "@/types/common";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";

interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  timestamp: string; // ISO string
  profiles: JoinedProfile | null; // Joined profile data
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

  const [users, setUsers] = React.useState<{ id: string; name: string }[]>([]);
  const [activityLogs, setActivityLogs] = React.useState<UserActivityLog[]>([]);
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

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    let query = supabase
      .from('user_activity_logs')
      .select(`
        id,
        user_id,
        action,
        details,
        timestamp,
        profiles ( id, name, email )
      `)
      .gte('timestamp', startOfMonth.toISOString())
      .lte('timestamp', endOfMonth.toISOString());

    if (isAdmin && filterUserId !== "All") {
      query = query.eq("user_id", filterUserId);
    }

    if (debouncedSearchQuery) {
      query = query.or(`action.ilike.%${debouncedSearchQuery}%,profiles.name.ilike.%${debouncedSearchQuery}%,profiles.email.ilike.%${debouncedSearchQuery}%`);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      console.error("Error fetching user activity logs:", error);
      setError("Failed to load user activity logs.");
      showError("Failed to load user activity logs.");
      setActivityLogs([]);
    } else {
      setActivityLogs((data || []).map((activity: any) => ({
        id: activity.id,
        user_id: activity.user_id,
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp,
        profiles: activity.profiles ? { id: activity.profiles.id, name: activity.profiles.name, email: activity.profiles.email } : null,
      })));
    }
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, debouncedSearchQuery, isAdmin, filterUserId]);

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

  const subtitle = `Period: ${months.find((m) => m.value === filterMonth)?.label} ${filterYear}` +
    (isAdmin && filterUserId !== "All" ? ` • User: ${users.find((u) => u.id === filterUserId)?.name || "Selected"}` : "") +
    (debouncedSearchQuery ? ` • Search: ${debouncedSearchQuery}` : "");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">User Activity Report</h1>
      <p className="text-lg text-muted-foreground">
        Track and review user actions within the application.
      </p>
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
              a.profiles?.name || a.profiles?.email || "Unknown User",
              a.action,
              format(parseISO(a.timestamp), "MMM dd, yyyy hh:mm a"),
              a.details && Object.keys(a.details).length > 0 ? JSON.stringify(a.details) : "-",
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
                  placeholder="Search user or action..."
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
                      {activity.profiles?.name || activity.profiles?.email || 'Unknown User'}
                    </TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{format(parseISO(activity.timestamp), "MMM dd, yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">
                      {activity.details && Object.keys(activity.details).length > 0
                        ? JSON.stringify(activity.details)
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">
              No user activity found for the selected criteria.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityReport;