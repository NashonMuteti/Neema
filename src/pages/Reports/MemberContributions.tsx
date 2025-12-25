"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

interface MemberProfile {
  id: string;
  name: string;
  email: string;
}

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
  const [memberSummaries, setMemberSummaries] = React.useState<MemberSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchMemberContributions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setError("Failed to load member profiles.");
      setLoading(false);
      return;
    }

    const summaries: MemberSummary[] = [];

    for (const profile of profiles || []) {
      let totalContributed = 0;
      let totalExpected = 0;

      // Fetch income transactions for this member
      const { data: incomeData, error: incomeError } = (await supabase
        .from('income_transactions')
        .select('amount')
        .eq('profile_id', profile.id) // Changed to profile_id
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())) as { data: { amount: number }[] | null, error: PostgrestError | null };

      if (incomeError) console.error(`Error fetching income for ${profile.name}:`, incomeError);
      else totalContributed += (incomeData || []).reduce((sum, tx) => sum + tx.amount, 0);

      // Fetch project collections (actual contributions to projects)
      const { data: collectionsData, error: collectionsError } = (await supabase
        .from('project_collections')
        .select('amount')
        .eq('member_id', profile.id)
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())) as { data: { amount: number }[] | null, error: PostgrestError | null };

      if (collectionsError) console.error(`Error fetching collections for ${profile.name}:`, collectionsError);
      else totalContributed += (collectionsData || []).reduce((sum, c) => sum + c.amount, 0);

      // Fetch project pledges (expected contributions)
      const { data: pledgesData, error: pledgesError } = (await supabase
        .from('project_pledges')
        .select('amount, status')
        .eq('member_id', profile.id)
        .gte('due_date', startOfMonth.toISOString())
        .lte('due_date', endOfMonth.toISOString())) as { data: { amount: number; status: string }[] | null, error: PostgrestError | null };

      if (pledgesError) console.error(`Error fetching pledges for ${profile.name}:`, pledgesError);
      else {
        totalExpected += (pledgesData || []).reduce((sum, p) => sum + p.amount, 0);
      }

      summaries.push({
        id: profile.id,
        name: profile.name || profile.email || "Unknown",
        email: profile.email || "N/A",
        totalContributed,
        totalExpected,
      });
    }

    const filteredAndSorted = summaries.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    setMemberSummaries(filteredAndSorted);
    setLoading(false);
  }, [filterMonth, filterYear, searchQuery]);

  useEffect(() => {
    fetchMemberContributions();
  }, [fetchMemberContributions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
        <p className="text-lg text-muted-foreground">Loading member contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

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
                      <SelectItem value="0">January</SelectItem>
                      <SelectItem value="1">February</SelectItem>
                      <SelectItem value="2">March</SelectItem>
                      <SelectItem value="3">April</SelectItem>
                      <SelectItem value="4">May</SelectItem>
                      <SelectItem value="5">June</SelectItem>
                      <SelectItem value="6">July</SelectItem>
                      <SelectItem value="7">August</SelectItem>
                      <SelectItem value="8">September</SelectItem>
                      <SelectItem value="9">October</SelectItem>
                      <SelectItem value="10">November</SelectItem>
                      <SelectItem value="11">December</SelectItem>
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
                      <SelectItem value={(currentYear - 2).toString()}>{(currentYear - 2)}</SelectItem>
                      <SelectItem value={(currentYear - 1).toString()}>{(currentYear - 1)}</SelectItem>
                      <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                      <SelectItem value={(currentYear + 1).toString()}>{(currentYear + 1)}</SelectItem>
                      <SelectItem value={(currentYear + 2).toString()}>{(currentYear + 2)}</SelectItem>
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

          {memberSummaries.length > 0 ? (
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
                {memberSummaries.map((member) => (
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