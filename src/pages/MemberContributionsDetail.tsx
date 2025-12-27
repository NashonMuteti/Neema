"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format, getMonth, getYear, parseISO, startOfYear, endOfYear } from "date-fns";
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
  PledgeTxRow,
  Project // Generic Project interface for all active projects
} from "@/components/members/member-contributions/types";


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
  const [allActiveProjects, setAllActiveProjects] = useState<Project[]>([]); // ALL active projects in the system
  const [totalYearlyPledgedAmount, setTotalYearlyPledgedAmount] = useState(0);
  const [totalYearlyPaidAmount, setTotalYearlyPaidAmount] = useState(0);
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

    // Date range for fetching all transactions (now covers the entire filterYear)
    const startOfPeriod = startOfYear(new Date(parseInt(filterYear), 0, 1));
    const endOfPeriod = endOfYear(new Date(parseInt(filterYear), 0, 1));

    const allContributions: MemberContribution[] = [];
      
    // Fetch Income Transactions for the selected year, filtered for project-related income
    const { data: incomeData, error: incomeError } = await supabase
      .from('income_transactions')
      .select('id, date, amount, source, financial_accounts(name), pledge_id') // Select pledge_id
      .eq('profile_id', memberId)
      .gte('date', startOfPeriod.toISOString())
      .lte('date', endOfPeriod.toISOString())
      .or('source.ilike.%Project Collection:%,pledge_id.not.is.null') // Filter for project collections or paid pledges
      as { data: IncomeTxRow[] | null, error: PostgrestError | null };

    if (incomeError) console.error("Error fetching income:", incomeError);
    incomeData?.forEach(tx => allContributions.push({
      id: tx.id,
      type: 'income',
      date: parseISO(tx.date),
      amount: tx.amount,
      sourceOrPurpose: tx.source,
      accountName: tx.financial_accounts?.name || 'Unknown Account',
      pledgeId: tx.pledge_id || undefined, // Include pledgeId
    }));

    // Fetch Project Pledges for the selected year
    const { data: pledgesData, error: pledgesError } = await supabase
      .from('project_pledges')
      .select('id, due_date, amount, status, comments, projects(name)')
      .eq('member_id', memberId)
      .gte('due_date', startOfPeriod.toISOString())
      .lte('due_period', endOfPeriod.toISOString()) as { data: PledgeTxRow[] | null, error: PostgrestError | null };

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

    // --- New: Fetch ALL pledges for the CURRENT YEAR for the Pledge Summary ---
    const startOfCurrentYear = startOfYear(new Date(currentYear, 0, 1));
    const endOfCurrentYear = endOfYear(new Date(currentYear, 0, 1));

    const { data: yearlyPledgesData, error: yearlyPledgesError } = await supabase
      .from('project_pledges')
      .select('amount, status')
      .eq('member_id', memberId)
      .gte('due_date', startOfCurrentYear.toISOString())
      .lte('due_date', endOfCurrentYear.toISOString()) as { data: { amount: number; status: "Active" | "Paid" | "Overdue" }[] | null, error: PostgrestError | null };

    if (yearlyPledgesError) {
      console.error("MemberContributionsDetail: Error fetching yearly pledges:", yearlyPledgesError);
      setTotalYearlyPledgedAmount(0);
      setTotalYearlyPaidAmount(0);
    } else {
      const totalPledged = (yearlyPledgesData || []).reduce((sum, p) => sum + p.amount, 0);
      const totalPaid = (yearlyPledgesData || []).filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      setTotalYearlyPledgedAmount(totalPledged);
      setTotalYearlyPaidAmount(totalPaid);
    }
    // --- End New Pledge Summary Fetch ---

    // Fetch ALL active projects (for system-wide expected contributions AND member-specific project breakdown)
    const { data: allProjectsData, error: allProjectsError } = await supabase
      .from('projects')
      .select('id, name, member_contribution_amount')
      .eq('status', 'Open'); // Only open projects

    if (allProjectsError) console.error("Error fetching all active projects:", allProjectsError);
    setAllActiveProjects(allProjectsData || []);

    const filteredAndSorted = allContributions
      .filter(c => c.sourceOrPurpose.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
      
    setMemberContributions(filteredAndSorted);
    setLoading(false);
  }, [memberId, currentUser, authLoading, filterYear, searchQuery, currentYear, setViewingMemberName]); // filterMonth is no longer a direct dependency for the main fetch

  useEffect(() => {
    fetchMemberData();
    
    return () => {
      setViewingMemberName(null); // Clear the name when component unmounts
    };
  }, [fetchMemberData, setViewingMemberName]);

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
        totalYearlyPledgedAmount={totalYearlyPledgedAmount}
        totalYearlyPaidAmount={totalYearlyPaidAmount}
        allActiveProjects={allActiveProjects} // Pass ALL active projects
        memberId={memberId} // Pass memberId
        renderDay={renderDay}
        memberName={memberName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
};

export default MemberContributionsDetail;