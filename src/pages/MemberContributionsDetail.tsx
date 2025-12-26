"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { useViewingMember } from "@/context/ViewingMemberContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { canAccessMemberData, logSecurityEvent } from "@/utils/security";
import { showError } from "@/utils/toast";
import MemberContributionsHeader from "@/components/members/member-contributions/MemberContributionsHeader";
import MemberContributionsTabs from "@/components/members/member-contributions/MemberContributionsTabs";
import { 
  MemberContribution, 
  IncomeTxRow, 
  ExpenditureTxRow, 
  PettyCashTxRow,
  PledgeTxRow // New import
} from "@/components/members/member-contributions/types";

interface UserProject {
  id: string;
  name: string;
  member_contribution_amount: number | null;
}

const MemberContributionsDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { setViewingMemberName } = useViewingMember();
  const { currentUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [memberName, setMemberName] = useState("Unknown Member");
  const [memberProjects, setMemberProjects] = useState<UserProject[]>([]); // New state for member's projects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchMemberData = useCallback(async () => {
    if (authLoading || !currentUser || !memberId) {
      return;
    }

    // Security check: Verify user is authorized to access this member's data
    const isAuthorized = await canAccessMemberData(currentUser.id, memberId);
    setAuthorized(isAuthorized);
    
    if (!isAuthorized) {
      logSecurityEvent('Unauthorized member data access attempt', {
        userId: currentUser.id,
        targetMemberId: memberId,
        path: window.location.pathname
      });
      setError("You are not authorized to view this member's contributions.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch member name
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', memberId)
      .single();

    if (profileError) {
      console.error("Error fetching member profile:", profileError);
      setError("Failed to load member profile.");
      setLoading(false);
      return;
    }

    if (profileData) {
      const name = profileData.name || profileData.email || "Unknown Member";
      setMemberName(name);
      setViewingMemberName(name);
    } else {
      setError("Member not found.");
      setLoading(false);
      return;
    }

    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const allContributions: MemberContribution[] = [];
      
    // Fetch Income Transactions
    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name)')
      .eq('profile_id', memberId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    if (incomeError) console.error("Error fetching income:", incomeError);
    incomeData?.forEach(tx => allContributions.push({
      id: tx.id,
      type: 'income',
      date: parseISO(tx.date),
      amount: tx.amount,
      sourceOrPurpose: tx.source,
      accountName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Expenditure Transactions
    const { data: expenditureData, error: expenditureError } = await supabase
      .from('expenditure_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', memberId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: ExpenditureTxRow[] | null, error: PostgrestError | null };

    if (expenditureError) console.error("Error fetching expenditure:", expenditureError);
    expenditureData?.forEach(tx => allContributions.push({
      id: tx.id,
      type: 'expenditure',
      date: parseISO(tx.date),
      amount: tx.amount,
      sourceOrPurpose: tx.purpose,
      accountName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Petty Cash Transactions
    const { data: pettyCashData, error: pettyCashError } = await supabase
      .from('petty_cash_transactions')
      .select('id, date, amount, purpose, financial_accounts(name)')
      .eq('profile_id', memberId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString()) as { data: PettyCashTxRow[] | null, error: PostgrestError | null };

    if (pettyCashError) console.error("Error fetching petty cash:", pettyCashError);
    pettyCashData?.forEach(tx => allContributions.push({
      id: tx.id,
      type: 'petty_cash',
      date: parseISO(tx.date),
      amount: tx.amount,
      sourceOrPurpose: tx.purpose,
      accountName: tx.financial_accounts?.name || 'Unknown Account',
    }));

    // Fetch Project Pledges
    const { data: pledgesData, error: pledgesError } = await supabase
      .from('project_pledges')
      .select('id, due_date, amount, status, comments, projects(name)')
      .eq('member_id', memberId)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString()) as { data: PledgeTxRow[] | null, error: PostgrestError | null };

    if (pledgesError) console.error("Error fetching pledges:", pledgesError);
    pledgesData?.forEach(pledge => allContributions.push({
      id: pledge.id,
      type: 'pledge',
      date: parseISO(pledge.due_date), // Use due_date as the transaction date for pledges
      amount: pledge.amount,
      sourceOrPurpose: pledge.comments || pledge.projects?.name || 'Project Pledge',
      accountName: pledge.projects?.name || 'Unknown Project',
      status: pledge.status,
      dueDate: parseISO(pledge.due_date),
    }));

    // Fetch projects where this member is the creator
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, member_contribution_amount')
      .eq('profile_id', memberId)
      .eq('status', 'Open'); // Only open projects

    if (projectsError) console.error("Error fetching member's projects:", projectsError);
    setMemberProjects(projectsData || []);

    const filteredAndSorted = allContributions
      .filter(c => c.sourceOrPurpose.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
      
    setMemberContributions(filteredAndSorted);
    setLoading(false);
  }, [memberId, currentUser, authLoading, filterMonth, filterYear, searchQuery, setViewingMemberName]);

  useEffect(() => {
    fetchMemberData();
    
    return () => {
      setViewingMemberName(null); // Clear the name when component unmounts
    };
  }, [fetchMemberData, setViewingMemberName]);

  // Calculations now only reflect pledges
  const totalPaidPledges = memberContributions.filter(t => t.type === 'pledge' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const totalPendingPledges = memberContributions.filter(t => t.type === 'pledge' && (t.status === 'Active' || t.status === 'Overdue')).reduce((sum, t) => sum + t.amount, 0);

  const contributionsByDate = memberContributions.reduce((acc, contribution) => {
    const dateKey = format(contribution.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contribution);
    return acc;
  }, {} as Record<string, MemberContribution[]>);

  const renderDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayContributions = contributionsByDate[dateKey];
    
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

  if (authLoading || loading) {
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
        totalIncome={0} // Removed from overview, set to 0
        totalExpenditure={0} // Removed from overview, set to 0
        netBalance={0} // Removed from overview, set to 0
        totalPaidPledges={totalPaidPledges} // New prop
        totalPendingPledges={totalPendingPledges} // New prop
        memberProjects={memberProjects} // New prop
        renderDay={renderDay}
        memberName={memberName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
};

export default MemberContributionsDetail;