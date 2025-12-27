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
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Transaction,
  MonthYearOption,
  Project // Generic Project interface for all active projects
} from "./types";
import { getContributionStatus } from "@/utils/contributionUtils";
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
  totalYearlyPledgedAmount: number; // Overall yearly pledged
  totalYearlyPaidAmount: number;     // Overall yearly paid
  allActiveProjects: Project[]; // ALL active projects in the system
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
  totalYearlyPledgedAmount,
  totalYearlyPaidAmount,
  allActiveProjects, // Use ALL active projects
  currentUserId, // Use currentUserId
  renderDay,
  currency,
}) => {
  const [myProjectPledgeSummary, setMyProjectPledgeSummary] = useState<
    { projectId: string; projectName: string; pledged: number; paid: number }[]
  >([]);
  const [loadingMyProjectPledgeSummary, setLoadingMyProjectPledgeSummary] = useState(true);

  // Fetch user's specific pledges and paid amounts for each active project
  useEffect(() => {
    const fetchMyProjectPledgeSummary = async () => {
      setLoadingMyProjectPledgeSummary(true);
      const summary: { projectId: string; projectName: string; pledged: number; paid: number }[] = [];

      for (const project of allActiveProjects) {
        // Fetch all pledges (Active + Paid) from this user for this project
        const { data: allPledgesData, error: allPledgesError } = await supabase
          .from('project_pledges')
          .select('amount, status')
          .eq('project_id', project.id)
          .eq('member_id', currentUserId);

        if (allPledgesError) {
          console.error(`Error fetching all pledges for project ${project.name} by user ${currentUserId}:`, allPledgesError);
          showError(`Failed to load pledges for project ${project.name}.`);
        }
        const totalPledgedForProject = (allPledgesData || []).reduce((sum, p) => sum + p.amount, 0);
        const totalPaidForProject = (allPledgesData || []).filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

        summary.push({
          projectId: project.id,
          projectName: project.name,
          pledged: totalPledgedForProject,
          paid: totalPaidForProject,
        });
      }
      setMyProjectPledgeSummary(summary);
      setLoadingMyProjectPledgeSummary(false);
    };

    if (allActiveProjects.length > 0 && currentUserId) {
      fetchMyProjectPledgeSummary();
    } else {
      setMyProjectPledgeSummary([]);
      setLoadingMyProjectPledgeSummary(false);
    }
  }, [allActiveProjects, currentUserId]);

  // Calculate totals for the "My Pledges to Active Projects" table
  const subtotalPledged = myProjectPledgeSummary.reduce((sum, p) => sum + p.pledged, 0);
  const subtotalPaid = myProjectPledgeSummary.reduce((sum, p) => sum + p.paid, 0);
  const balanceToPay = subtotalPledged - subtotalPaid;

  const amountDueForPayment = totalYearlyPledgedAmount - totalYearlyPaidAmount;

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
            <CardTitle>Pledge Summary for {getYear(new Date()).toString()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Pledged (Yearly)</TableCell>
                  <TableCell className="text-right">{currency.symbol}{totalYearlyPledgedAmount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Paid (Yearly)</TableCell>
                  <TableCell className="text-right">{currency.symbol}{totalYearlyPaidAmount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell>Amount Due for Payment (Yearly)</TableCell>
                  <TableCell className="text-right">{currency.symbol}{amountDueForPayment.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* My Pledges to Active Projects (User-specific breakdown) */}
            {loadingMyProjectPledgeSummary ? (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Pledges to Active Projects</h3>
                <p className="text-muted-foreground">Loading project pledges...</p>
              </div>
            ) : myProjectPledgeSummary.length > 0 ? (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Pledges to Active Projects</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Pledged</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myProjectPledgeSummary.map(project => (
                      <TableRow key={project.projectId}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.pledged.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.paid.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell>Subtotal</TableCell>
                      <TableCell className="text-right">{currency.symbol}{subtotalPledged.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{subtotalPaid.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={2}>Balance to Pay</TableCell>
                      <TableCell className="text-right">{currency.symbol}{balanceToPay.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">My Pledges to Active Projects</h3>
                <p className="text-muted-foreground">No active projects found for you to pledge to.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyContributionsOverviewTab;