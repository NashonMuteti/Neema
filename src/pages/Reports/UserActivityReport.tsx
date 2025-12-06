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

interface UserActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string; // ISO string
}

const dummyUserActivity: UserActivity[] = [
  { id: "ua1", user: "Alice Johnson", action: "Logged in", timestamp: "2023-10-26T10:00:00Z" },
  { id: "ua2", user: "Bob Williams", action: "Edited Project X", timestamp: "2023-10-26T10:15:00Z" },
  { id: "ua3", user: "Charlie Brown", action: "Added new pledge", timestamp: "2023-10-26T10:30:00Z" },
  { id: "ua4", user: "Alice Johnson", action: "Viewed Petty Cash Report", timestamp: "2023-10-26T11:00:00Z" },
  { id: "ua5", user: "David Green", action: "Created Project Y", timestamp: "2024-07-01T09:00:00Z" },
  { id: "ua6", user: "Alice Johnson", action: "Updated Member Profile", timestamp: "2024-07-05T14:30:00Z" },
  { id: "ua7", user: "Bob Williams", action: "Deleted Project Z", timestamp: "2024-07-10T16:00:00Z" },
  { id: "ua8", user: "Charlie Brown", action: "Posted Income", timestamp: "2024-08-01T11:00:00Z" },
  { id: "ua9", user: "David Green", action: "Viewed Pledge Report", timestamp: "2024-08-05T10:00:00Z" },
];

const UserActivityReport = () => {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed

  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const filteredActivity = React.useMemo(() => {
    return dummyUserActivity.filter(activity => {
      const activityDate = parseISO(activity.timestamp);
      const matchesDate = getMonth(activityDate).toString() === filterMonth && getYear(activityDate).toString() === filterYear;
      const matchesSearch = activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            activity.action.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    }).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()); // Sort by date descending
  }, [filterMonth, filterYear, searchQuery]);

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

          {filteredActivity.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.user}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{format(parseISO(activity.timestamp), "MMM dd, yyyy hh:mm a")}</TableCell>
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