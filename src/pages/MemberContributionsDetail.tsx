"use client";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useViewingMember } from "@/context/ViewingMemberContext";
import MemberContributionsHeader from "@/components/members/member-contributions/MemberContributionsHeader";
import MemberContributionsTabs from "@/components/members/member-contributions/MemberContributionsTabs";
import { useMemberContributions } from "@/hooks/use-member-contributions";

const MemberContributionsDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { setViewingMemberName } = useViewingMember();
  const navigate = useNavigate();

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
  } = useMemberContributions({ userId: memberId, isDetailPage: true });

  useEffect(() => {
    if (memberName) {
      setViewingMemberName(memberName);
    }
    return () => {
      setViewingMemberName(null); // Clear the name when component unmounts
    };
  }, [memberName, setViewingMemberName]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions</h1>
        <p className="text-lg text-muted-foreground">Loading member contributions...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-lg text-destructive">You do not have permission to view this member's contributions.</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Member Contributions</h1>
        <p className="text-lg text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate("/members")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MemberContributionsHeader memberName={memberName} />
      <p className="text-lg text-muted-foreground">
        Detailed view of {memberName}'s financial activities.
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

export default MemberContributionsDetail;