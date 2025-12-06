"use client";

import React from "react";
import { useParams, Link } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Dummy data for all members' contributions (imported from Reports/MemberContributions for consistency)
import { allMembersContributions } from "@/pages/Reports/MemberContributions";

interface MemberContribution {
  id: string;
  projectId: string;
  projectName: string;
  date: string; // ISO string
  amount: number; // Actual contributed
  expected: number; // Expected contribution
}

interface AllContribution extends MemberContribution {
  memberId: string;
  memberName: string;
  memberEmail: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getContributionStatus = (amount: number, expected: number): { text: string; variant: BadgeVariant } => {
  if (amount >= expected) {
    return { text: "Met", variant: "default" };
  } else if (amount > 0) {
    return { text: "Partial", variant: "secondary" };
  } else {
    return { text: "Deficit", variant: "destructive" };
  }
};

const MemberContributionsDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
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

  const memberContributions = allMembersContributions.filter(c => c.memberId === memberId);
  const memberName = memberContributions.length > 0 ? memberContributions[0].memberName : "Unknown Member";

  // --- Logic for "Contributions Overview" tab (Calendar & Summary) ---
  const filteredOverviewContributions: MemberContribution[] = memberContributions.filter(contribution => {
    const contributionDate = parseISO(contribution.date);
    return (
      getMonth(contributionDate).toString() === filterMonth &&
      getYear(contributionDate).toString() === filterYear
    );
  }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()); // Sort by date ascending

  const totalOverviewContributed = filteredOverviewContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalOverviewExpected = filteredOverviewContributions.reduce((sum, c) => sum + c.expected, 0);
  const overviewDeficit = totalOverviewExpected - totalOverviewContributed;

  const overviewContributionsByDate = filteredOverviewContributions.reduce((acc, contribution) => {
    const dateKey = format(parseISO(contribution.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, MemberContribution[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = overviewContributionsByDate[dateKey];
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

  // --- Logic for "Detailed Contributions" tab (Table) ---
  const filteredDetailedContributions: AllContribution[] = React.useMemo(() => {
    return memberContributions.filter(contribution => {
      const contributionDate = parseISO(contribution.date);
      const matchesDate = getMonth(contributionDate).toString() === filterMonth && getYear(contributionDate).toString() === filterYear;
      const matchesSearch = contribution.projectName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesSearch;
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()); // Sort by date descending
  }, [memberContributions, filterMonth, filterYear, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/members">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{memberName}'s Contributions</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Detailed view of {memberName}'s contributions to projects.
      </p>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Contributions Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Contributions</TabsTrigger>
        </TabsList>

        {/* Contributions Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-6">
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
                  <p className="text-xl font-bold text-primary">${totalOverviewContributed.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Total Expected:</p>
                  <p className="text-xl font-bold text-secondary">${totalOverviewExpected.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-muted-foreground">Deficit:</p>
                  <p className={cn("text-xl font-bold", overviewDeficit > 0 ? "text-destructive" : "text-green-600")}>
                    ${overviewDeficit.toFixed(2)}
                  </p>
                </div>

                {selectedDate && overviewContributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-lg">Contributions on {format(selectedDate, "PPP")}</h3>
                    {overviewContributionsByDate[format(selectedDate, "yyyy-MM-dd")].map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-sm">
                        <span>{c.projectName}</span>
                        <Badge variant="secondary">${c.amount.toFixed(2)} / ${c.expected.toFixed(2)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && !overviewContributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <p className="text-muted-foreground text-sm mt-6">No contributions on {format(selectedDate, "PPP")}.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Contributions Tab Content */}
        <TabsContent value="detailed" className="space-y-6 mt-6">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>Detailed Contributions for {memberName} ({months[parseInt(filterMonth)].label} {filterYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="filter-month-detailed">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger id="filter-month-detailed" className="w-[140px]">
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
                    <Label htmlFor="filter-year-detailed">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger id="filter-year-detailed" className="w-[120px]">
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
                      placeholder="Search project..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {filteredDetailedContributions.length > 0 ? (
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
                    {filteredDetailedContributions.map((contribution) => {
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
                <p className="text-muted-foreground text-center mt-4">No contributions found for the selected period or matching your search.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberContributionsDetail;