"use client";

import React, { useState, useEffect } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Transaction,
  MonthYearOption,
  Project // Generic Project interface for all active projects
} from "./types";
import { getContributionStatus } from "@/utils/contributionUtils"; // Updated import
import { useSystemSettings } from "@/context/SystemSettingsContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface MyContributionsOverviewTabProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  months: MonthYearOption[];
  years: MonthYearOption[];
  transactionsByDate: Record<string, Transaction[]>;
  totalPaidPledges: number;
  totalPendingPledges: number;
  allActiveProjects: Project[]; // ALL active projects in the system
  // Removed: activeMembersCount: number; // Total active members in the system
  currentUserId: string; // New prop: ID of the current user
  renderDay: (day: Date) => JSX.Element;
  currency: { code: string; symbol: string };
}

const MyContributionsOverviewTab: React.FC<MyContributionsOverviewTabProps> = ({
  selectedDate,
  setSelectedDate,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  months,
  years,
  transactionsByDate,
  totalPaidPledges,
  totalPendingPledges,
  allActiveProjects, // Use ALL active projects
  // Removed: activeMembersCount,
  currentUserId, // Use currentUserId
  renderDay,
  currency,
}) => {
  const [myProjectContributions, setMyProjectContributions] = useState<
    { projectId: string; projectName: string; expected: number; paid: number }[]
  >([]);
  const [loadingMyProjectContributions, setLoadingMyProjectContributions] = useState(true);

  // Removed: Calculate total expected contributions from ALL active projects (system-wide)
  // const totalExpectedAllProjectsContributions = allActiveProjects.reduce((sum, project) => 
  //   sum + ((project.member_contribution_amount || 0) * activeMembersCount)
  // , 0);

  // Fetch user's specific contributions to each active project
  useEffect(() => {
    const fetchMyProjectContributions = async () => {
      setLoadingMyProjectContributions(true);
      const contributions: { projectId: string; projectName: string; expected: number; paid: number }[] = [];

      for (const project of allActiveProjects) {
        const expected = project.member_contribution_amount || 0;

        // Fetch collections specifically from this user for this project
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id)
          .eq('member_id', currentUserId); // Filter by the current user

        if (collectionsError) {
          console.error(`Error fetching collections for project ${project.name} by user ${currentUserId}:`, collectionsError);
          showError(`Failed to load collections for project ${project.name}.`);
        }
        const paid = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        contributions.push({
          projectId: project.id,
          projectName: project.name,
          expected: expected,
          paid: paid,
        });
      }
      setMyProjectContributions(contributions);
      setLoadingMyProjectContributions(false);
    };

    if (allActiveProjects.length > 0 && currentUserId) {
      fetchMyProjectContributions();
    } else {
      setMyProjectContributions([]);
      setLoadingMyProjectContributions(false);
    }
  }, [allActiveProjects, currentUserId]);

  // Calculate totals for the "My Contributions to Active Projects" table
  const totalExpectedFromUserToAllProjects = myProjectContributions.reduce((sum, p) => sum + p.expected, 0);
  const totalPaidFromUserToAllProjects = myProjectContributions.reduce((sum, p) => sum + p.paid, 0);
  const balanceToPayFromUserToAllProjects = totalExpectedFromUserToAllProjects - totalPaidFromUserToAllProjects;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar and Filters */}
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Activity Calendar</CardTitle>
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
              setFilterMonth(String(month.getMonth()));
              setFilterYear(String(month.getFullYear()));
            }}
            components={{
              DayContent: ({ date }) => {
                const dateKey = format(date, "yyyy-MM-dd");
                const dayTransactions = transactionsByDate[dateKey];
                return (
                  <div
                    className={cn(
                      "relative text-center w-full h-full flex items-center justify-center",
                      dayTransactions && dayTransactions.length > 0 && "bg-primary/20 rounded-full"
                    )}
                  >
                    {date.getDate()}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Activity on Selected Date and Financial Summary */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Activity on {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDate && transactionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <>
                {transactionsByDate[format(selectedDate, "yyyy-MM-dd")].map((t) => {
                  const status = getContributionStatus(t.type, t.status);
                  const isIncomeOrPaidPledge = t.type === 'income' || (t.type === 'pledge' && t.status === 'Paid');
                  return (
                    <div key={t.id} className="flex justify-between items-center text-sm">
                      <span>{t.description} ({t.accountOrProjectName})</span>
                      <Badge variant={status.variant}>
                        {isIncomeOrPaidPledge ? '+' : '-'}{currency.symbol}{t.amount.toFixed(2)}
                      </Badge>
                    </div>
                  );
                })}
              </>
            )}
            {selectedDate && !transactionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <p className="text-muted-foreground text-sm">No activity on {format(selectedDate, "PPP")}.</p>
            )}
            {!selectedDate && (
              <p className="text-muted-foreground text-sm">Select a date on the calendar to view activity.</p>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pledge Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Pledge Summary</h3>
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">Total Paid Pledges:</p>
                <p className="font-bold text-primary">{currency.symbol}{totalPaidPledges.toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">Total Pending Pledges:</p>
                <p className="font-bold text-destructive">{currency.symbol}{totalPendingPledges.toFixed(2)}</p>
              </div>
            </div>

            {/* My Contributions to Active Projects (User-specific breakdown) */}
            {loadingMyProjectContributions ? (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Contributions to Active Projects</h3>
                <p className="text-muted-foreground">Loading project contributions...</p>
              </div>
            ) : myProjectContributions.length > 0 ? (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Contributions to Active Projects</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myProjectContributions.map(project => (
                      <TableRow key={project.projectId}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.expected.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.paid.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{currency.symbol}{totalExpectedFromUserToAllProjects.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{totalPaidFromUserToAllProjects.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={2}>Balance to Pay</TableCell>
                      <TableCell className="text-right">{currency.symbol}{balanceToPayFromUserToAllProjects.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Contributions to Active Projects</h3>
                <p className="text-muted-foreground">No active projects found for you to contribute to.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyContributionsOverviewTab;