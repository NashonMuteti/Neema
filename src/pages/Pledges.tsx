"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, getMonth, getYear, isBefore, startOfDay, parseISO } from "date-fns";
import { CalendarIcon, Edit, Trash2, CheckCircle, Search } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

interface Member {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Pledge {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: Date; // Changed to Date
  status: "Active" | "Paid" | "Overdue";
  member_name: string; // Added for joined data
  project_name: string; // Added for joined data
}

// Define the expected structure of a pledge row with joined profile and project data
interface PledgeRowWithJoinedData {
  id: string;
  member_id: string;
  project_id: string;
  amount: number;
  due_date: string; // ISO string from DB
  status: "Active" | "Paid" | "Overdue";
  profiles: { name: string } | null; // Joined profile data
  projects: { name: string } | null; // Joined project data
}

const Pledges = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const { canManagePledges } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManagePledges: false };
    }
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManagePledges = currentUserPrivileges.includes("Manage Pledges");
    return { canManagePledges };
  }, [currentUser, definedRoles]);

  // Data states
  const [members, setMembers] = React.useState<Member[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [pledges, setPledges] = React.useState<Pledge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State for new pledge
  const [newPledgeMemberId, setNewPledgeMemberId] = React.useState<string | undefined>(undefined);
  const [newPledgeProjectId, setNewPledgeProjectId] = React.useState<string | undefined>(undefined);
  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(undefined);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Paid" | "Overdue">("All");
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const getPledgeStatus = (pledge: Pledge): Pledge['status'] => {
    if (pledge.status === "Paid") return "Paid";
    const today = startOfDay(new Date());
    const dueDate = startOfDay(pledge.due_date);
    if (isBefore(dueDate, today)) {
      return "Overdue";
    }
    return "Active";
  };

  const fetchInitialData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      setError("Failed to load members.");
    } else {
      setMembers(membersData || []);
      if (membersData && membersData.length > 0 && !newPledgeMemberId) {
        setNewPledgeMemberId(membersData[0].id);
      }
    }

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      setError("Failed to load projects.");
    } else {
      setProjects(projectsData || []);
      if (projectsData && projectsData.length > 0 && !newPledgeProjectId) {
        setNewPledgeProjectId(projectsData[0].id);
      }
    }

    // Fetch pledges based on filters
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);

    const { data: pledgesData, error: pledgesError } = (await supabase
      .from('project_pledges')
      .select(`
        id,
        member_id,
        project_id,
        amount,
        due_date,
        status,
        profiles ( name ),
        projects ( name )
      `)
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString())
      .order('due_date', { ascending: false })) as { data: PledgeRowWithJoinedData[] | null, error: PostgrestError | null };

    if (pledgesError) {
      console.error("Error fetching pledges:", pledgesError);
      setError("Failed to load pledges.");
      setPledges([]);
    } else {
      const fetchedPledges: Pledge[] = (pledgesData || []).map(p => ({
        id: p.id,
        member_id: p.member_id,
        project_id: p.project_id,
        amount: p.amount,
        due_date: parseISO(p.due_date),
        status: p.status as "Active" | "Paid" | "Overdue",
        member_name: p.profiles?.name || 'Unknown Member', // Access name directly from typed profiles
        project_name: p.projects?.name || 'Unknown Project', // Access name directly from typed projects
      }));

      const filteredByStatusAndSearch = fetchedPledges.filter(pledge => {
        const actualStatus = getPledgeStatus(pledge);
        const matchesStatus = filterStatus === "All" || actualStatus === filterStatus;
        const memberName = (pledge.member_name || "").toLowerCase();
        const projectName = (pledge.project_name || "").toLowerCase();
        const matchesSearch = memberName.includes(searchQuery.toLowerCase()) || projectName.includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });
      setPledges(filteredByStatusAndSearch);
    }
    setLoading(false);
  }, [newPledgeMemberId, newPledgeProjectId, filterMonth, filterYear, filterStatus, searchQuery]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRecordPledge = async () => {
    if (!currentUser) {
      showError("You must be logged in to record a pledge.");
      return;
    }
    if (!newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const amount = parseFloat(newPledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    const { error: insertError } = await supabase
      .from('project_pledges')
      .insert({
        member_id: newPledgeMemberId,
        project_id: newPledgeProjectId,
        amount,
        due_date: newPledgeDueDate.toISOString(),
        status: "Active", // New pledges are active by default
      });

    if (insertError) {
      console.error("Error recording pledge:", insertError);
      showError("Failed to record pledge.");
    } else {
      showSuccess("Pledge recorded successfully!");
      fetchInitialData(); // Re-fetch all data to update lists
      // Reset form
      setNewPledgeAmount("");
      setNewPledgeDueDate(undefined);
      // Keep selected member/project or reset based on preference
      setNewPledgeMemberId(members.length > 0 ? members[0].id : undefined);
      setNewPledgeProjectId(projects.length > 0 ? projects[0].id : undefined);
    }
  };

  const handleEditPledge = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with pledge data
    console.log("Editing pledge:", id);
    showError(`Edit functionality for pledge ${id} is not yet implemented.`);
  };

  const handleDeletePledge = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to delete pledges.");
      return;
    }
    const { error: deleteError } = await supabase
      .from('project_pledges')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Error deleting pledge:", deleteError);
      showError("Failed to delete pledge.");
    } else {
      showSuccess("Pledge deleted successfully!");
      fetchInitialData(); // Re-fetch all data to update lists
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!canManagePledges) {
      showError("You do not have permission to mark pledges as paid.");
      return;
    }
    const { error: updateError } = await supabase
      .from('project_pledges')
      .update({ status: "Paid" })
      .eq('id', id);

    if (updateError) {
      console.error("Error marking pledge as paid:", updateError);
      showError("Failed to mark pledge as paid.");
    } else {
      showSuccess("Pledge marked as paid!");
      fetchInitialData(); // Re-fetch all data to update lists
    }
  };

  const getStatusBadgeClasses = (status: Pledge['status']) => {
    switch (status) {
      case "Active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-muted-foreground">Loading pledges data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
      <p className="text-lg text-muted-foreground">
        Record and track financial commitments (pledges) from members for various projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record New Pledge Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Pledge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pledge-member">Member</Label>
              <Select value={newPledgeMemberId} onValueChange={setNewPledgeMemberId} disabled={!canManagePledges || members.length === 0}>
                <SelectTrigger id="pledge-member">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Members</SelectLabel>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {members.length === 0 && <p className="text-sm text-muted-foreground">No members available. Add members first.</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pledge-project">Project</Label>
              <Select value={newPledgeProjectId} onValueChange={setNewPledgeProjectId} disabled={!canManagePledges || projects.length === 0}>
                <SelectTrigger id="pledge-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Projects</SelectLabel>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects available. Add projects first.</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pledge-amount">Amount</Label>
              <Input
                id="pledge-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPledgeAmount}
                onChange={(e) => setNewPledgeAmount(e.target.value)}
                disabled={!canManagePledges}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pledge-due-date">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPledgeDueDate && "text-muted-foreground"
                    )}
                    disabled={!canManagePledges}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPledgeDueDate ? format(newPledgeDueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newPledgeDueDate}
                    onSelect={setNewPledgeDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleRecordPledge} className="w-full" disabled={!canManagePledges || !newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate}>
              Record Pledge
            </Button>
          </CardContent>
        </Card>

        {/* Recent Pledges Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Pledges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="grid gap-1.5 flex-1 min-w-[120px]">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={(value: "All" | "Active" | "Paid" | "Overdue") => setFilterStatus(value)}>
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Pledge Status</SelectLabel>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[120px]">
                <Label htmlFor="filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[100px]">
                <Label htmlFor="filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="filter-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center flex-1 min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Search member/project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {pledges.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {canManagePledges && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pledges.map((pledge) => {
                    const status = getPledgeStatus(pledge);
                    const memberName = members.find(m => m.id === pledge.member_id)?.name;
                    const projectName = projects.find(p => p.id === pledge.project_id)?.name;
                    return (
                      <TableRow key={pledge.id}>
                        <TableCell className="font-medium">{memberName}</TableCell>
                        <TableCell>{projectName}</TableCell>
                        <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                        <TableCell>{format(pledge.due_date, "MMM dd, yyyy")}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusBadgeClasses(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                        {canManagePledges && (
                          <TableCell className="text-center">
                            <div className="flex justify-center space-x-2">
                              {status !== "Paid" && (
                                <Button variant="outline" size="icon" onClick={() => handleMarkAsPaid(pledge.id)}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEditPledge(pledge.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePledge(pledge.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No pledges found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;