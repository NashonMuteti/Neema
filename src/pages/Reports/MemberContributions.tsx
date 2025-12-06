"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { format, getMonth, getYear, parseISO } from "date-fns";

// Dummy data for all members' contributions (aggregated from various sources)
export const allMembersContributions = [ // Exported for reuse
  { id: "mc1", memberId: "m1", memberName: "Alice Johnson", memberEmail: "alice@example.com", projectId: "proj1", projectName: "Film Production X", date: "2024-07-10", amount: 50, expected: 100 },
  { id: "mc2", memberId: "m1", memberName: "Alice Johnson", memberEmail: "alice@example.com", projectId: "proj5", projectName: "Short Film Contest", date: "2024-07-15", amount: 20, expected: 20 },
  { id: "mc3", memberId: "m1", memberName: "Alice Johnson", memberEmail: "alice@example.com", projectId: "proj1", projectName: "Film Production X", date: "2024-08-01", amount: 50, expected: 100 },
  { id: "mc4", memberId: "m2", memberName: "Bob Williams", memberEmail: "bob@example.com", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-08-10", amount: 25, expected: 50 },
  { id: "mc5", memberId: "m2", memberName: "Bob Williams", memberEmail: "bob@example.com", projectId: "proj5", projectName: "Short Film Contest", date: "2024-09-05", amount: 10, expected: 20 },
  { id: "mc6", memberId: "m3", memberName: "Charlie Brown", memberEmail: "charlie@example.com", projectId: "proj1", projectName: "Film Production X", date: "2024-09-20", amount: 25, expected: 100 },
  { id: "mc7", memberId: "m3", memberName: "Charlie Brown", memberEmail: "charlie@example.com", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-10-01", amount: 25, expected: 50 },
  { id: "mc8", memberId: "m4", memberName: "David Green", memberEmail: "david@example.com", projectId: "proj1", projectName: "Film Production X", date: "2024-07-22", amount: 70, expected: 100 },
  { id: "mc9", memberId: "m4", memberName: "David Green", memberEmail: "david@example.com", projectId: "proj2", projectName: "Marketing Campaign Y", date: "2024-08-15", amount: 30, expected: 50 },
];

interface MemberSummary {
  id: string;
  name: string;
  email: string;
  totalContributed: number;
  totalExpected: number;
}

const MemberContributions = () => {
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

  const aggregatedContributions: MemberSummary[] = React.useMemo(() => {
    const filteredByDate = allMembersContributions.filter(contribution => {
      const contributionDate = parseISO(contribution.date);
      return (
        getMonth(contributionDate).toString() === filterMonth &&
        getYear(contributionDate).toString() === filterYear
      );
    });

    const memberMap = new Map<string, MemberSummary>();

    filteredByDate.forEach(contribution => {
      if (!memberMap.has(contribution.memberId)) {
        memberMap.set(contribution.memberId, {
          id: contribution.memberId,
          name: contribution.memberName,
          email: contribution.memberEmail,
          totalContributed: 0,
          totalExpected: 0,
        });
      }
      const memberSummary = memberMap.get(contribution.memberId)!;
      memberSummary.totalContributed += contribution.amount;
      memberSummary.totalExpected += contribution.expected;
    });

    const sortedMembers = Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return sortedMembers.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filterMonth, filterYear, searchQuery]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
      <p className="text-lg text-muted-foreground">
        View a summary of all member contributions for a selected period.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Contributions Summary for {months[parseInt(filterMonth)].label} {filterYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-1.5">
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
              </div>
              <div className="grid gap-1.5">
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
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {aggregatedContributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Contributed</TableHead>
                  <TableHead className="text-right">Total Expected</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedContributions.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="text-right">${member.totalContributed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${member.totalExpected.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Link to={`/members/${member.id}/contributions`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No member contributions found for the selected period or matching your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributions;