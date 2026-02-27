"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { DateRange } from "react-day-picker";
import DateRangePicker from "@/components/reports/DateRangePicker";

export type PledgeStatusFilter = "All" | "Paid" | "Unpaid" | "Overdue";

type ProjectOption = { id: string; name: string };
type MemberOption = { id: string; name: string; email: string };

interface Props {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  status: PledgeStatusFilter;
  setStatus: (status: PledgeStatusFilter) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  memberId: string;
  setMemberId: (id: string) => void;
  projects: ProjectOption[];
  members: MemberOption[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function PledgeFilters({
  dateRange,
  setDateRange,
  status,
  setStatus,
  projectId,
  setProjectId,
  memberId,
  setMemberId,
  projects,
  members,
  searchQuery,
  setSearchQuery,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="grid gap-1.5 min-w-[260px]">
        <Label>Due date range</Label>
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[260px]" />
      </div>

      <div className="grid gap-1.5 min-w-[160px]">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as PledgeStatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 min-w-[220px]">
        <Label>Project</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 min-w-[220px]">
        <Label>Member</Label>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger>
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 flex-1 min-w-[220px]">
        <Label>Search</Label>
        <div className="relative flex items-center">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Member, project, comments..."
            className="pl-8"
          />
          <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
