"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MemberContribution, Project } from "./types";
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

interface MemberContributionsOverviewProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  filterYear: string;
  setFilterYear: (year: string) => void;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  memberContributions: MemberContribution[];
  contributionsByDate: Record<string, MemberContribution[]>;
  totalYearlyPledgedAmount: number; // Overall yearly pledged
  totalYearlyPaidAmount: number;     // Overall yearly paid
  allActiveProjects: Project[]; // ALL active projects in the system
  memberId: string; // New prop: ID of the member being viewed
  renderDay: (day: Date) => JSX.Element;
}

const MemberContributionsOverview: React.FC<MemberContributionsOverviewProps> = ({
  selectedDate,
  setSelectedDate,
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  months,
  years,
  memberContributions,
  contributionsByDate,
  totalYearlyPledgedAmount,
  totalYearlyPaidAmount,
  allActiveProjects, // Use ALL active projects
  memberId, // Use memberId
  renderDay
}) => {
  const { currency } = useSystemSettings();
  const [memberProjectPledgeSummary, setMemberProjectPledgeSummary] = useState<
    { projectId: string; projectName: string; pledged: number; paid: number }[]
  >([]);
  const [loadingMemberProjectPledgeSummary, setLoadingMemberProjectPledgeSummary] = useState(true);

  // Fetch member's specific pledges and paid amounts for each active project
  useEffect(() => {
    const fetchMemberProjectPledgeSummary = async () => {
      setLoadingMemberProjectPledgeSummary(true);
      const summary: { projectId: string; projectName: string; pledged: number; paid: number }[] = [];

      for (const project of allActiveProjects) {
        // Fetch all pledges (Active + Paid) from this member for this project
        const { data: allPledgesData, error: allPledgesError } = await supabase
          .from('project_pledges')
          .select('amount, status')
          .eq('project_id', project.id)
          .eq('member_id', memberId); // Filter by the specific member

        if (allPledgesError) {
          console.error(`Error fetching all pledges for project ${project.name} by member ${memberId}:`, allPledgesError);
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
      setMemberProjectPledgeSummary(summary);
      setLoadingMemberProjectPledgeSummary(false);
    };

    if (allActiveProjects.length > 0 && memberId) {
      fetchMemberProjectPledgeSummary();
    } else {
      setMemberProjectPledgeSummary([]);
      setLoadingMemberProjectPledgeSummary(false);
    }
  }, [allActiveProjects, memberId]);

  // Calculate totals for the "My Pledges to Active Projects" table
  const subtotalPledged = memberProjectPledgeSummary.reduce((sum, p) => sum + p.pledged, 0);
  const subtotalPaid = memberProjectPledgeSummary.reduce((sum, p) => sum + p.paid, 0);
  const balanceToPay = subtotalPledged - subtotalPaid;

  const amountDueForPayment = totalYearlyPledgedAmount - totalYearlyPaidAmount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar and Filters */}
      <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl">
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
              setFilterMonth(getMonth(month).toString());
              setFilterYear(getYear(month).toString());
            }}
            components={{
              DayContent: ({ date }) => {
                const dateKey = format(date, "yyyy-MM-dd");
                const dayContributions = contributionsByDate[dateKey];
                return (
                  <div
                    className={cn(
                      "relative text-center w-full h-full flex items-center justify-center",
                      dayContributions && dayContributions.length > 0 && "bg-primary/20 rounded-full"
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
      
      {/* Financial Summary */}
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

          {/* My Pledges to Active Projects (Member-specific breakdown) */}
          {loadingMemberProjectPledgeSummary ? (
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">Pledges to Active Projects</h3>
              <p className="text-muted-foreground">Loading project pledges...</p>
            </div>
          ) : memberProjectPledgeSummary.length > 0 ? (
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">Pledges to Active Projects</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Pledged</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberProjectPledgeSummary.map(project => (
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
              <h3 className="font-semibold text-lg">Pledges to Active Projects</h3>
              <p className="text-muted-foreground">No active projects found for this member to pledge to.</p>
            </div>
          )}
          
          {selectedDate && contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-lg">Activity on {format(selectedDate, "PPP")}</h3>
              {contributionsByDate[format(selectedDate, "yyyy-MM-dd")].map((c) => {
                const status = getContributionStatus(c.type, c.status);
                const isIncomeOrPaidPledge = c.type === 'income' || (c.type === 'pledge' && c.status === 'Paid');
                return (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span>{c.sourceOrPurpose} ({c.accountName})</span>
                    <Badge variant={status.variant}>
                      {isIncomeOrPaidPledge ? '+' : '-'}{currency.symbol}{c.amount.toFixed(2)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
          
          {selectedDate && !contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
            <p className="text-muted-foreground text-sm mt-6">
              No activity on {format(selectedDate, "PPP")}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributionsOverview;