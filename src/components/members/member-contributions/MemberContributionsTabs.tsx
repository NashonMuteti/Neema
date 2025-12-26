"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberContributionsOverview from "./MemberContributionsOverview";
import MemberContributionsDetailed from "./MemberContributionsDetailed";
import { MemberContribution } from "./types";

interface UserProject {
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

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
  totalIncome: number; // Kept for now, but will be 0
  totalExpenditure: number; // Kept for now, but will be 0
  netBalance: number; // Kept for now, but will be 0
  totalPaidPledges: number; // New prop
  totalPendingPledges: number; // New prop
  memberProjects: UserProject[]; // New prop
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
  totalIncome,
  totalExpenditure,
  netBalance,
  totalPaidPledges, // Destructure new prop
  totalPendingPledges, // Destructure new prop
  memberProjects, // Destructure new prop
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
          totalIncome={totalIncome}
          totalExpenditure={totalExpenditure}
          netBalance={netBalance}
          totalPaidPledges={totalPaidPledges} // Pass new prop
          totalPendingPledges={totalPendingPledges} // Pass new prop
          memberProjects={memberProjects} // Pass new prop
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