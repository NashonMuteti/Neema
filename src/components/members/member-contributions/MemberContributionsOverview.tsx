"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getContributionStatus, MemberContribution, MemberProjectWithCollections } from "./types";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  totalPaidPledges: number;
  totalPendingPledges: number;
  memberProjectsWithCollections: MemberProjectWithCollections[]; // New prop
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
  totalPaidPledges,
  totalPendingPledges,
  memberProjectsWithCollections, // Use new prop
  renderDay
}) => {
  const { currency } = useSystemSettings(); // Use currency from context

  // Calculate totals for projects created by the member
  const totalExpectedFromMemberProjects = memberProjectsWithCollections.reduce((sum, project) => sum + (project.member_contribution_amount || 0), 0);
  const totalPaidForMemberProjects = memberProjectsWithCollections.reduce((sum, project) => sum + project.totalCollections, 0);
  const balanceToPayForMemberProjects = totalExpectedFromMemberProjects - totalPaidForMemberProjects;

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

          {/* Projects Created by Member Summary */}
          {memberProjectsWithCollections.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">Projects Created by Member</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberProjectsWithCollections.map(project => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{(project.member_contribution_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{project.totalCollections.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{currency.symbol}{totalExpectedFromMemberProjects.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{totalPaidForMemberProjects.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={2}>Balance to Pay</TableCell>
                    <TableCell className="text-right">{currency.symbol}{balanceToPayForMemberProjects.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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