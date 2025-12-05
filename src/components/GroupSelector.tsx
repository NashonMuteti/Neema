"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GroupSelector() {
  // This will eventually be populated from a backend
  const groups = [
    { id: "1", name: "Production A" },
    { id: "2", name: "Post-Production B" },
    { id: "3", name: "Marketing C" },
  ];

  const [selectedGroup, setSelectedGroup] = React.useState(groups[0].id);

  return (
    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a group" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Your Groups</SelectLabel>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}