"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MemberContribution, Project } from "@/types/common"; // Updated import path
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
  memberName: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  const [memberProjectContributionsSummary, setMemberProjectContributionsSummary] = useState<
    { projectId: string; projectName: string; expected: number; pledged: number; paid: number; }[]
  >([]);
  const [loadingMemberProjectContributionsSummary, setLoadingMemberProjectContributionsSummary] = useState(true);

  // Fetch member's specific contributions (pledges and collections) for each active project
  useEffect(() => {
    const fetchMemberProjectContributionsSummary = async () => {
      setLoadingMemberProjectContributionsSummary(true);
      const summary: { projectId: string; projectName: string; expected: number; pledged: number; paid: number; }[] = [];

      for (const project of allActiveProjects) {
        const expected = project.member_contribution_amount || 0;

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
        const totalPaidPledgesForProject = (allPledgesData || []).filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

        // Fetch direct collections from this member for this project
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('project_collections')
          .select('amount')
          .eq('project_id', project.id)
          .eq('member_id', memberId);

        if (collectionsError) {
          console.error(`Error fetching collections for project ${project.name} by member ${memberId}:`, collectionsError);
          showError(`Failed to load collections for project ${project.name}.`);
        }
        const totalCollectedForProject = (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

        summary.push({
          projectId: project.id,
          projectName: project.name,
          expected: expected,
          pledged: totalPledgedForProject,
          paid: totalPaidPledgesForProject + totalCollectedForProject, // Paid is sum of paid pledges and direct collections
        });
      }
      setMemberProjectContributionsSummary(summary);
      setLoadingMemberProjectContributionsSummary(false);
    };

    if (allActiveProjects.length > 0 && memberId) {
      fetchMemberProjectContributionsSummary();
    } else {
      setMemberProjectContributionsSummary([]);
      setLoadingMemberProjectContributionsSummary(false);
    }
  }, [allActiveProjects, memberId]);

  // Calculate totals for the "Member Contributions to Active Projects" table
  const subtotalExpected = memberProjectContributionsSummary.reduce((sum, p) => sum + p.expected, 0);
  const subtotalPledged = memberProjectContributionsSummary.reduce((sum, p) => sum + p.pledged, 0);
  const subtotalPaid = memberProjectContributionsSummary.reduce((sum, p) => sum + p.paid, 0);
  const overallBalanceDue = subtotalExpected - subtotalPaid;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Changed to lg:grid-cols-3 */}
      {/* Calendar and Filters */}
      <Card className="lg:col-span-1 transition-all duration-300 ease-in-out hover:shadow-xl">
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
      
      {/* Activity on Selected Date and Contributions Summary */}
      <div className="grid grid-cols-1 gap-6 lg:col-span-2"> {/* Changed to lg:col-span-2 */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Activity on {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDate && contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <>
                {contributionsByDate[format(selectedDate, "yyyy-MM-dd")]
                  .filter(t => t.type === 'income' || t.type === 'pledge') // Filter for contributions/pledges only
                  .map((c) => {
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
              </>
            )}
            {selectedDate && !contributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
              <p className="text-muted-foreground text-sm">
                No activity on {format(selectedDate, "PPP")}.
              </p>
            )}
            {!selectedDate && (
              <p className="text-muted-foreground text-sm">Select a date on the calendar to view activity.</p>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Contributions Summary per Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingMemberProjectContributionsSummary ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">Loading project contributions...</p>
              </div>
            ) : memberProjectContributionsSummary.length > 0 ? (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Pledged</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberProjectContributionsSummary.map(project => (
                      <TableRow key={project.projectId}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.expected.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.pledged.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currency.symbol}{project.paid.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell>Subtotal</TableCell>
                      <TableCell className="text-right">{currency.symbol}{subtotalExpected.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{subtotalPledged.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{subtotalPaid.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={3}>Balance to Pay</TableCell>
                      <TableCell className="text-right">{currency.symbol}{overallBalanceDue.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">No active projects found for this member to contribute to.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberContributionsOverview;