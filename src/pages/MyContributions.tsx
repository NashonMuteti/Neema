"use client";

import React from "react";
import { format, getMonth, getYear } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useMemberContributions } from "@/hooks/use-member-contributions";
import MemberContributionsTabs from "@/components/members/member-contributions/MemberContributionsTabs";

const MyContributions: React.FC = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const {
    selectedDate,
    setSelectedDate,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    memberContributions,
    contributionsByDate,
    totalIncome,
    totalExpenditure,
    netBalance,
    renderDay,
    memberName,
    loading,
    error,
    authorized,
  } = useMemberContributions({ userId: currentUser?.id, isDetailPage: false });

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
        <p className="text-lg text-muted-foreground">Loading your contributions...</p>
      </div>
    );
  }

  if (error || authorized === false) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
        <p className="text-lg text-destructive">{error || "You are not authorized to view this content."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Contributions</h1>
      <p className="text-lg text-muted-foreground">
        View your personal financial activities.
      </p>

      <MemberContributionsTabs
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
        renderDay={renderDay}
        memberName={memberName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
};

export default MyContributions;