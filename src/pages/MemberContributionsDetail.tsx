"use client";

import React from "react";
import { useParams } from "react-router-dom";
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

// Dummy data for all members' contributions
// In a real app, this would be fetched from a backend for the specific memberId
const allMembersContributions = [
  { memberId: "m1", memberName: "Alice Johnson", id: "c1", projectId: "proj1", projectName: "Film Production X", date: "2024-07-10", amount: 50, expected: 100 },
  { memberId: "m1", memberName: "Alice Johnson", id: "c2", projectId: "proj5", projectName: "Short Film Contest", date: "2024-07-15", amount: 20, expected: 20 },
  { memberId: "m1", memberName: "Alice Johnson", id: "c3", projectId: "proj1", projectName: "Film Production X", date: "2024-08-01", amount: 50, expected: 100 },
  { memberId: "m2", memberName: "Bob Williams", id: "c4", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-08-10", amount: 25, expected: 50 },
  { memberId: "m2", memberName: "Bob Williams", id: "c5", projectId: "proj5", projectName: "Short Film Contest", date: "2024-09-05", amount: 10, expected: 20 },
  { memberId: "m3", memberName: "Charlie Brown", id: "c6", projectId: "proj1", projectName: "Film Production X", date: "2024-09-20", amount: 25, expected: 100 },
  { memberId: "m3", memberName: "Charlie Brown", id: "c7", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-10-01", amount: 25, expected: 50 },
];

const MemberContributionsDetail = () => {
  const { memberId } = useParams<{ memberId: string }>();
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

  const memberContributions = allMembersContributions.filter(c => c.memberId === memberId);
  const memberName = memberContributions.length > 0 ? memberContributions[0].memberName : "Unknown Member";

  const filteredContributions = memberContributions.filter(contribution => {
    const contributionDate = parseISO(contribution.date);
    return (
      getMonth(contributionDate).toString() === filterMonth &&
      getYear(contributionDate).toString() === filterYear
    );
  });

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
  }, {} as Record<string, typeof allMembersContributions>);

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
      <h1 className="text-3xl font-bold text-primary-foreground">{memberName}'s Contributions</h1>
      <p className="text-lg text-muted-foreground">
        Detailed view of {memberName}'s contributions to projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar and Filters */}
        <Card className="lg:col-span-2 transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Contribution Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
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
              className="rounded-md border shadow"
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
    </div>
  );
};

export default MemberContributionsDetail;