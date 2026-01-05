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
import { useAuth } => "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { logUserActivity } from "@/utils/activityLogger"; // Import the new logger
import { JoinedProfile } from "@/types/common"; // Import JoinedProfile

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
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");
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
      `) // Added 'id' to profiles select
      .gte('timestamp', startOfMonth.toISOString())
      .lte('timestamp', endOfMonth.toISOString());

    if (searchQuery) {
      query = query.or(`action.ilike.%${searchQuery}%,profiles.name.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%`);
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
        profiles: activity.profiles ? { id: activity.profiles.id, name: activity.profiles.name, email: activity.profiles.email } : null, // Explicitly map to JoinedProfile
      })));
    }
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  React.useEffect(() => {
    fetchActivityLogs();
    // Log a dummy activity when the report is viewed (for demonstration)
    if (currentUser) {
      logUserActivity(currentUser, "Viewed User Activity Report", { month: format(new Date(parseInt(filterYear), parseInt(filterMonth)), "MMMM yyyy") });
    }
  }, [fetchActivityLogs, currentUser, filterMonth, filterYear]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">User Activity Report</h1>
      <p className="text-lg text-muted-foreground">
        Track and review all user actions within the application.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Recent User Actions</CardTitle>
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
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search user or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    <TableCell className="font-medium">{activity.profiles?.name || activity.profiles?.email || 'Unknown User'}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{format(parseISO(activity.timestamp), "MMM dd, yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {activity.details && Object.keys(activity.details).length > 0
                        ? JSON.stringify(activity.details)
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No user activity found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityReport;