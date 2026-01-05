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

interface MemberFiltersProps {
  filterStatus: "All" | "Active" | "Inactive" | "Suspended";
  setFilterStatus: (status: "All" | "Active" | "Inactive" | "Suspended") => void;
  searchQuery: string; // This is now the localSearchQuery from parent
  setSearchQuery: (query: string) => void; // This is now setLocalSearchQuery from parent
}

const MemberFilters: React.FC<MemberFiltersProps> = ({
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <h2 className="text-xl font-semibold">Member List</h2>
      <div className="grid gap-1.5 flex-1 min-w-[120px]">
        <Label htmlFor="filter-status">Status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger id="filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All Members</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="relative flex items-center flex-1 min-w-[180px]">
        <Label htmlFor="search-members" className="sr-only">Search members</Label>
        <Input
          id="search-members"
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
        <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default MemberFilters;