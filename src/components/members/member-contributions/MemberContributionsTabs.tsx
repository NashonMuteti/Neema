"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberContributionsOverview from "./MemberContributionsOverview";
import MemberContributionsDetailed from "./MemberContributionsDetailed";
import { MemberContribution, Project } from "./types";

interface MemberContributionsTabsProps {
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
  totalYearlyPledgedAmount: number;
  totalYearlyPaidAmount: number;
  allActiveProjects: Project[]; // ALL active projects in the system
  memberId: string; // New prop: ID of the member being viewed
  renderDay: (day: Date) => JSX.Element;
  memberName: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const MemberContributionsTabs: React.FC<MemberContributionsTabsProps> = ({
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
  totalYearlyPledgedAmount,
  totalYearlyPaidAmount,
  allActiveProjects, // Use ALL active projects
  memberId, // Use memberId
  renderDay,
  memberName,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="detailed">Detailed Transactions</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6 mt-6">
        <MemberContributionsOverview
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          months={months}
          years={years}
          memberContributions={memberContributions}
          contributionsByDate={contributionsByDate}
          totalYearlyPledgedAmount={totalYearlyPledgedAmount}
          totalYearlyPaidAmount={totalYearlyPaidAmount}
          allActiveProjects={allActiveProjects} // Pass ALL active projects
          memberId={memberId} // Pass memberId
          renderDay={renderDay}
        />
      </TabsContent>
      
      <TabsContent value="detailed" className="space-y-6 mt-6">
        <MemberContributionsDetailed
          memberName={memberName}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          months={months}
          years={years}
          memberContributions={memberContributions}
        />
      </TabsContent>
    </Tabs>
  );
};

export default MemberContributionsTabs;