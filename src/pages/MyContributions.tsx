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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { Input } from "@/components/ui/input"; // Import Input for search
import { Search } from "lucide-react"; // Import Search icon
import { Label } from "@/components/ui/label"; // Import Label for filters

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

// Dummy data for all members' contributions (imported from Reports/MemberContributions for consistency)
// In a real app, this would be fetched from a central backend source
import { allMembersContributions } from "@/pages/Reports/MemberContributions"; // Corrected import to named export

interface UserContribution {
  id: string;
  projectId: string;
  projectName: string;
  date: string; // ISO string
  amount: number; // Actual contributed
  expected: number; // Expected contribution
}

interface AllContribution extends UserContribution {
  memberId: string;
  memberName: string;
  memberEmail: string;
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
  const [searchQuery, setSearchQuery] = React.useState(""); // Search query for All Contributions tab

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  // --- Logic for "My Contributions" tab ---
  const filteredMyContributions: UserContribution[] = dummyUserContributions.filter(contribution => {
    const contributionDate = parseISO(contribution.date);
    return (
      getMonth(contributionDate).toString() === filterMonth &&
      getYear(contributionDate).toString() === filterYear
    );
  }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()); // Sort by date ascending

  const totalMyContributed = filteredMyContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalMyExpected = filteredMyContributions.reduce((sum, c) => sum + c.expected, 0);
  const myDeficit = totalMyExpected - totalMyContributed;

  const myContributionsByDate = filteredMyContributions.reduce((acc, contribution) => {
    const dateKey = format(parseISO(contribution.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, UserContribution[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = myContributionsByDate[dateKey];
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

  // --- Logic for "All Contributions" tab ---
  const filteredAllContributions: AllContribution[] = React.useMemo(() => {
    return allMembersContributions.filter(contribution => { // Used named export directly
      const contributionDate = parseISO(contribution.date);
      const matchesDate = getMonth(contributionDate).toString() === filterMonth && getYear(contributionDate).toString() === filterYear;
      const matchesSearch = contribution.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            contribution.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            contribution.memberEmail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()); // Sort by date descending
  }, [filterMonth, filterYear, searchQuery]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View and manage contributions across the organization.
      </p>

      <Tabs defaultValue="my-contributions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-contributions">My Contributions</TabsTrigger>
          <TabsTrigger value="all-contributions">All Contributions</TabsTrigger>
        </TabsList>

        {/* My Contributions Tab Content */}
        <TabsContent value="my-contributions" className="space-y-6 mt-6">
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
                  <p className="text-xl font-bold text-primary">${totalMyContributed.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Total Expected:</p>
                  <p className="text-xl font-bold text-secondary">${totalMyExpected.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-muted-foreground">Deficit:</p>
                  <p className={cn("text-xl font-bold", myDeficit > 0 ? "text-destructive" : "text-green-600")}>
                    ${myDeficit.toFixed(2)}
                  </p>
                </div>

                {selectedDate && myContributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-lg">Contributions on {format(selectedDate, "PPP")}</h3>
                    {myContributionsByDate[format(selectedDate, "yyyy-MM-dd")].map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-sm">
                        <span>{c.projectName}</span>
                        <Badge variant="secondary">${c.amount.toFixed(2)} / ${c.expected.toFixed(2)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDate && !myContributionsByDate[format(selectedDate, "yyyy-MM-dd")] && (
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
              {filteredMyContributions.length > 0 ? (
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
                    {filteredMyContributions.map((contribution) => {
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
        </TabsContent>

        {/* All Contributions Tab Content */}
        <TabsContent value="all-contributions" className="space-y-6 mt-6">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>All Contributions Overview for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="filter-month-all">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger id="filter-month-all" className="w-[140px]">
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
                    <Label htmlFor="filter-year-all">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger id="filter-year-all" className="w-[120px]">
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
                      placeholder="Search member/project..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {filteredAllContributions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Contributed</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllContributions.map((contribution) => {
                      const status = getContributionStatus(contribution.amount, contribution.expected);
                      return (
                        <TableRow key={contribution.id}>
                          <TableCell className="font-medium">{contribution.memberName}</TableCell>
                          <TableCell>{contribution.projectName}</TableCell>
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

export default MyContributions;