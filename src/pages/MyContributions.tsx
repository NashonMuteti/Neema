"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, getMonth, getYear, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Dummy data for the logged-in user's contributions
// In a real app, this would be fetched from a backend for the current user
const dummyUserContributions = [
  { id: "c1", projectId: "proj1", projectName: "Film Production X", date: "2024-07-10", amount: 50, expected: 100 },
  { id: "c2", projectId: "proj5", projectName: "Short Film Contest", date: "2024-07-15", amount: 20, expected: 20 },
  { id: "c3", projectId: "proj1", projectName: "Film Production X", date: "2024-08-01", amount: 50, expected: 100 },
  { id: "c4", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-08-10", amount: 25, expected: 50 },
  { id: "c5", projectId: "proj5", projectName: "Short Film Contest", date: "2024-09-05", amount: 10, expected: 20 },
  { id: "c6", projectId: "proj1", projectName: "Film Production X", date: "2024-09-20", amount: 25, expected: 100 },
  { id: "c7", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-10-01", amount: 25, expected: 50 },
];

interface UserContribution {
  id: string;
  projectId: string;
  projectName: string;
  date: string; // ISO string
  amount: number; // Actual contributed
  expected: number; // Expected contribution
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"; // Define allowed badge variants

const getContributionStatus = (amount: number, expected: number): { text: string; variant: BadgeVariant } => {
  if (amount >= expected) {
    return { text: "Met", variant: "default" };
  } else if (amount > 0) {
    return { text: "Partial", variant: "secondary" };
  } else {
    return { text: "Deficit", variant: "destructive" };
  }
};

const MyContributions: React.FC = () => {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const filteredContributions: UserContribution[] = dummyUserContributions.filter(contribution => {
    const contributionDate = parseISO(contribution.date);
    return (
      getMonth(contributionDate).toString() === filterMonth &&
      getYear(contributionDate).toString() === filterYear
    );
  }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()); // Sort by date ascending

  const totalContributed = filteredContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalExpected = filteredContributions.reduce((sum, c) => sum + c.expected, 0);
  const deficit = totalExpected - totalContributed;

  const contributionsByDate = filteredContributions.reduce((acc, contribution) => {
    const dateKey = format(parseISO(contribution.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, UserContribution[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = contributionsByDate[dateKey];
    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayContributions && dayContributions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <span className="h-1 w-1 rounded-full bg-primary" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View your personal contributions to all open projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar and Filters */}
        <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Contribution Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-stretch space-y-4">
            <div className="flex flex-wrap gap-4 justify-center">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[140px]">
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
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]">
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
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow w-full"
              month={new Date(parseInt(filterYear), parseInt(filterMonth))}
              onMonthChange={(month) => {
                setFilterMonth(getMonth(month).toString());
                setFilterYear(getYear(month).toString());
              }}
              components={{
                DayContent: ({ date }) => renderDay(date),
              }}
            />
          </CardContent>
        </Card>

        {/* Contribution Summary */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Total Contributed:</p>
              <p className="text-xl font-bold text-primary">${totalContributed.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Total Expected:</p>
              <p className="text-xl font-bold text-secondary">${totalExpected.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <p className="text-muted-foreground">Deficit:</p>
              <p className={cn("text-xl font-bold", deficit > 0 ? "text-destructive" : "text-green-600")}>
                ${deficit.toFixed(2)}
              </p>
            </div>

            {selectedDate && contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-lg">Contributions on {format(selectedDate, "PPP")}</h3>
                {contributionsByDate[format(selectedDate, "yyyy-MM-dd")].map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span>{c.projectName}</span>
                    <Badge variant="secondary">${c.amount.toFixed(2)} / ${c.expected.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            )}
            {selectedDate && !contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <p className="text-muted-foreground text-sm mt-6">No contributions on {format(selectedDate, "PPP")}.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Contributions Table */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl mt-6">
        <CardHeader>
          <CardTitle>Detailed Contributions for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Contributed</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContributions.map((contribution) => {
                  const status = getContributionStatus(contribution.amount, contribution.expected);
                  return (
                    <TableRow key={contribution.id}>
                      <TableCell className="font-medium">{contribution.projectName}</TableCell>
                      <TableCell>{format(parseISO(contribution.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-right">${contribution.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${contribution.expected.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No contributions found for the selected period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyContributions;