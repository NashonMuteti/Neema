"use client";

import React from "react";
import SoonDueProjectsGraph from "@/components/dashboard/SoonDueProjectsGraph"; // Import the new graph component
import ContributionsProgressGraph from "@/components/dashboard/ContributionsProgressGraph"; // Import the new contributions graph

// Define a simplified Project interface for the dashboard's dummy data
interface DashboardProject {
  id: string;
  name: string;
  dueDate?: Date;
  status: "Open" | "Closed" | "Deleted";
}

const Index = () => {
  // Dummy project data for the dashboard graph
  const dummyDashboardProjects: DashboardProject[] = [
    { id: "dp1", name: "Film Production X", status: "Open", dueDate: new Date(2024, 6, 10) }, // July 10, 2024 (Overdue/This Week depending on current date)
    { id: "dp2", name: "Marketing Campaign Y", status: "Open", dueDate: new Date(2024, 7, 5) }, // Aug 5, 2024 (Next 30 Days)
    { id: "dp3", name: "Post-Production Z", status: "Open", dueDate: new Date(2024, 8, 25) }, // Sep 25, 2024 (Later)
    { id: "dp4", name: "Short Film Contest", status: "Open", dueDate: new Date(2024, 6, 18) }, // July 18, 2024 (This Week)
    { id: "dp5", name: "New Script Development", status: "Open", dueDate: new Date(2024, 9, 1) }, // Oct 1, 2024 (Later)
    { id: "dp6", name: "Festival Submissions", status: "Open", dueDate: new Date(2024, 6, 3) }, // July 3, 2024 (Overdue)
    { id: "dp7", name: "Budget Review", status: "Open", dueDate: new Date(2024, 7, 20) }, // Aug 20, 2024 (Next 30 Days)
    { id: "dp8", name: "Archived Project B", status: "Closed", dueDate: new Date(2024, 5, 1) }, // Closed project
    { id: "dp9", name: "Deleted Project C", status: "Deleted", dueDate: new Date(2024, 4, 15) }, // Deleted project
  ];

  // Dummy data for contributions progress graph
  const dummyContributionsData = [
    { name: "Film Production X", expected: 1000, actual: 750 },
    { name: "Marketing Campaign Y", expected: 500, actual: 600 },
    { name: "Short Film Contest", expected: 200, actual: 180 },
    { name: "Budget Review", expected: 800, actual: 800 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to your cinematic financial management hub.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for Dashboard content */}
        <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Weekly Summary</h2>
          <p className="text-muted-foreground">Collections vs. expenses for the current week.</p>
          {/* More content will go here */}
        </div>
        <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Monthly Summary</h2>
          <p className="text-muted-foreground">Collections vs. expenses for the current month.</p>
          {/* More content will go here */}
        </div>
        {/* Soon Due Projects Graph */}
        <SoonDueProjectsGraph projects={dummyDashboardProjects} />
        {/* Contributions Progress Graph */}
        <ContributionsProgressGraph projectsData={dummyContributionsData} />
      </div>
    </div>
  );
};

export default Index;