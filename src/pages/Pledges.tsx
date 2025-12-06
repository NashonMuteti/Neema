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
import { format, getMonth, getYear, isBefore, startOfDay } from "date-fns";
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
import { useAuth } from "@/context/AuthContext"; // Import useAuth

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
  status: "Active" | "Paid" | "Overdue";
}

const Pledges = () => {
  const { isAdmin } = useAuth(); // Use the auth context
  // Form State
  const [newPledgeMemberId, setNewPledgeMemberId] = React.useState<string | undefined>(undefined);
  const [newPledgeProjectId, setNewPledgeProjectId] = React.useState<string | undefined>(undefined);
  const [newPledgeAmount, setNewPledgeAmount] = React.useState("");
  const [newPledgeDueDate, setNewPledgeDueDate] = React.useState<Date | undefined>(undefined);

  // Pledges List State
  const [pledges, setPledges] = React.useState<Pledge[]>([
    { id: "p1", memberId: "m1", projectId: "proj1", amount: 500, dueDate: new Date(2024, 6, 15), status: "Active" }, // July 15, 2024
    { id: "p2", memberId: "m2", projectId: "proj2", amount: 250, dueDate: new Date(2024, 5, 1), status: "Overdue" }, // June 1, 2024
    { id: "p3", memberId: "m3", projectId: "proj1", amount: 750, dueDate: new Date(2024, 7, 10), status: "Active" }, // Aug 10, 2024
    { id: "p4", memberId: "m1", projectId: "proj3", amount: 100, dueDate: new Date(2024, 4, 20), status: "Paid" }, // May 20, 2024
    { id: "p5", memberId: "m2", projectId: "proj5", amount: 150, dueDate: new Date(2024, 6, 25), status: "Active" }, // July 25, 2024
  ]);

  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterStatus, setFilterStatus] = React.useState<"All" | "Active" | "Paid" | "Overdue">("All");
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState(""); // New: Search query state

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

  const filteredPledges = pledges.filter(pledge => {
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

  const handleRecordPledge = () => {
    if (!newPledgeMemberId || !newPledgeProjectId || !newPledgeAmount || !newPledgeDueDate) {
      showError("All pledge fields are required.");
      return;
    }
    const amount = parseFloat(newPledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive pledge amount.");
      return;
    }

    const newPledge: Pledge = {
      id: `p${pledges.length + 1}`,
      memberId: newPledgeMemberId,
      projectId: newPledgeProjectId,
      amount,
      dueDate: newPledgeDueDate,
      status: getPledgeStatus({ id: "", memberId: "", projectId: "", amount, dueDate: newPledgeDueDate, status: "Active" }), // Determine initial status
    };

    setPledges((prev) => [...prev, newPledge]);
    showSuccess("Pledge recorded successfully!");
    // Reset form
    setNewPledgeMemberId(undefined);
    setNewPledgeProjectId(undefined);
    setNewPledgeAmount("");
    setNewPledgeDueDate(undefined);
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

  const handleMarkAsPaid = (id: string) => {
    setPledges((prev) =>
      prev.map((pledge) =>
        pledge.id === id ? { ...pledge, status: "Paid" } : pledge
      )
    );
    showSuccess("Pledge marked as paid!");
    console.log("Marking pledge as paid:", id);
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
              <Select value={newPledgeMemberId} onValueChange={setNewPledgeMemberId}>
                <SelectTrigger id="pledge-member">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Members</SelectLabel>
                    {dummyMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pledge-project">Project</Label>
              <Select value={newPledgeProjectId} onValueChange={setNewPledgeProjectId}>
                <SelectTrigger id="pledge-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Projects</SelectLabel>
                    {dummyProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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

            <Button onClick={handleRecordPledge} className="w-full">
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
              {/* New: Search Input */}
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

            {filteredPledges.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isAdmin && <TableHead className="text-center">Actions</TableHead>}
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
                        {isAdmin && (
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