"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, CheckCircle } from "lucide-react";
import { format, getMonth, getYear, isBefore, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useUserRoles } from "@/context/UserRolesContext"; // New import

// Dummy data for members and projects (should come from backend in a real app)
const dummyMembers = [
  { id: "m1", name: "Alice Johnson" },
  { id: "m2", name: "Bob Williams" },
  { id: "m3", name: "Charlie Brown" },
];

const dummyProjects = [
  { id: "proj1", name: "Film Production X" },
  { id: "proj2", name: "Marketing Campaign Y" },
  { id: "proj3", name: "Post-Production Z" },
  { id: "proj5", name: "Short Film Contest" },
];

interface Pledge {
  id: string;
  memberId: string;
  projectId: string;
  amount: number;
  dueDate: Date;
  status: "Active" | "Paid" | "Overdue"; // Status can be updated
}

const initialPledges: Pledge[] = [
  { id: "p1", memberId: "m1", projectId: "proj1", amount: 500, dueDate: new Date(2024, 6, 15), status: "Active" }, // July 15, 2024
  { id: "p2", memberId: "m2", projectId: "proj2", amount: 250, dueDate: new Date(2024, 5, 1), status: "Active" }, // June 1, 2024 (will be overdue)
  { id: "p3", memberId: "m3", projectId: "proj1", amount: 750, dueDate: new Date(2024, 7, 10), status: "Active" }, // Aug 10, 2024
  { id: "p4", memberId: "m1", projectId: "proj3", amount: 100, dueDate: new Date(2024, 4, 20), status: "Paid" }, // May 20, 2024
  { id: "p5", memberId: "m2", projectId: "proj5", amount: 150, dueDate: new Date(2024, 6, 25), status: "Active" }, // July 25, 2024
];

const PledgeReport = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManagePledges = currentUserPrivileges.includes("Manage Pledges");

  const [pledges, setPledges] = React.useState<Pledge[]>(initialPledges);
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
    const dueDate = startOfDay(pledge.dueDate);
    if (isBefore(dueDate, today)) {
      return "Overdue";
    }
    return "Active";
  };

  const filteredPledges = React.useMemo(() => {
    return pledges.filter(pledge => {
      const actualStatus = getPledgeStatus(pledge);
      const matchesStatus = filterStatus === "All" || actualStatus === filterStatus;

      const pledgeMonth = getMonth(pledge.dueDate);
      const pledgeYear = getYear(pledge.dueDate);
      const matchesDate = pledgeMonth.toString() === filterMonth && pledgeYear.toString() === filterYear;

      const memberName = dummyMembers.find(m => m.id === pledge.memberId)?.name.toLowerCase() || "";
      const projectName = dummyProjects.find(p => p.id === pledge.projectId)?.name.toLowerCase() || "";
      const matchesSearch = memberName.includes(searchQuery.toLowerCase()) || projectName.includes(searchQuery.toLowerCase());

      return matchesStatus && matchesDate && matchesSearch;
    }).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()); // Sort by due date descending
  }, [pledges, filterStatus, filterMonth, filterYear, searchQuery]);

  const handleMarkAsPaid = (id: string, memberName: string, amount: number) => {
    setPledges((prev) =>
      prev.map((pledge) =>
        pledge.id === id ? { ...pledge, status: "Paid" } : pledge
      )
    );
    showSuccess(`Payment initiated for ${memberName}'s pledge of $${amount.toFixed(2)}.`);
    console.log(`Initiating payment for pledge ID: ${id}`);
  };

  const handleEditPledge = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with pledge data
    console.log("Editing pledge:", id);
    showSuccess(`Edit functionality for pledge ${id} (placeholder).`);
  };

  const handleDeletePledge = (id: string) => {
    setPledges((prev) => prev.filter((pledge) => pledge.id !== id));
    showSuccess("Pledge deleted successfully!");
    console.log("Deleting pledge:", id);
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Pledge Report</h1>
      <p className="text-lg text-muted-foreground">
        View and manage pledges from members across all projects.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Pledge List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={filterStatus} onValueChange={(value: "All" | "Active" | "Paid" | "Overdue") => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="All">All Pledges</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Month</SelectLabel>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Year</SelectLabel>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="relative flex items-center">
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
          </div>

          {filteredPledges.length > 0 ? (
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
                {filteredPledges.map((pledge) => {
                  const status = getPledgeStatus(pledge);
                  const memberName = dummyMembers.find(m => m.id === pledge.memberId)?.name;
                  const projectName = dummyProjects.find(p => p.id === pledge.projectId)?.name;
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell className="font-medium">{memberName}</TableCell>
                      <TableCell>{projectName}</TableCell>
                      <TableCell className="text-right">${pledge.amount.toFixed(2)}</TableCell>
                      <TableCell>{format(pledge.dueDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClasses(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                      {canManagePledges && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            {status !== "Paid" && (
                              <Button variant="outline" size="icon" onClick={() => handleMarkAsPaid(pledge.id, memberName || "Unknown Member", pledge.amount)}>
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
            <p className="text-muted-foreground text-center mt-4">No pledges found for the selected filters or search query.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PledgeReport;