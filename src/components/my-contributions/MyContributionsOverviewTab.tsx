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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Transaction,
  getContributionStatus,
  MonthYearOption,
} from "./types";

interface Project { // Define Project interface for allActiveProjects
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

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
  allActiveProjects: Project[]; // Changed from myProjects to allActiveProjects
  activeMembersCount: number; // New prop
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
  allActiveProjects, // Use allActiveProjects
  activeMembersCount, // Use activeMembersCount
  renderDay,
  currency,
}) => {
  // Calculate total expected contributions from ALL active projects
  const totalExpectedAllProjectsContributions = allActiveProjects.reduce((sum, project) => 
    sum + ((project.member_contribution_amount || 0) * activeMembersCount)
  , 0);

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
                  return (
                    <div key={t.id} className="flex justify-between items-center text-sm">
                      <span>{t.description} ({t.accountOrProjectName})</span>
                      <Badge variant={status.variant}>
                        {t.type === 'income' || (t.type === 'pledge' && t.status === 'Paid') ? '+' : '-'}{currency.symbol}{t.amount.toFixed(2)}
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

            {/* Total Expected Contributions from All Active Projects */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">Total Expected from All Active Projects</h3>
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">Total Expected:</p>
                <p className="font-bold text-primary">{currency.symbol}{totalExpectedAllProjectsContributions.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                (Based on {activeMembersCount} active members and 'member contribution amount' for all active projects)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyContributionsOverviewTab;