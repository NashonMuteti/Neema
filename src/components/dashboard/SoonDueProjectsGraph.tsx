"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { addDays, isBefore, startOfDay } from "date-fns";

interface Project {
  id: string;
  name: string;
  dueDate?: Date;
  status: "Open" | "Closed" | "Deleted";
}

interface SoonDueProjectsGraphProps {
  projects: Project[];
}

interface CategorizedProjectData {
  name: string;
  count: number;
  fill: string;
  projectNames: string[]; // Added to store project names
}

const SoonDueProjectsGraph: React.FC<SoonDueProjectsGraphProps> = ({ projects }) => {
  const today = startOfDay(new Date());
  const sevenDaysFromNow = addDays(today, 7);
  const thirtyDaysFromNow = addDays(today, 30);

  const categorizeProjects = (allProjects: Project[]): CategorizedProjectData[] => {
    const categories: Record<string, { count: number; projects: string[]; fill: string }> = {
      "Overdue": { count: 0, projects: [], fill: "hsl(var(--destructive))" },
      "This Week": { count: 0, projects: [], fill: "hsl(var(--primary))" },
      "Next 30 Days": { count: 0, projects: [], fill: "hsl(var(--secondary))" },
      "Later": { count: 0, projects: [], fill: "hsl(var(--muted-foreground))" },
    };

    allProjects.forEach(project => {
      if (project.status === "Open" && project.dueDate) {
        const dueDate = startOfDay(new Date(project.dueDate));
        if (isBefore(dueDate, today)) {
          categories["Overdue"].count++;
          categories["Overdue"].projects.push(project.name);
        } else if (isBefore(dueDate, sevenDaysFromNow)) {
          categories["This Week"].count++;
          categories["This Week"].projects.push(project.name);
        } else if (isBefore(dueDate, thirtyDaysFromNow)) {
          categories["Next 30 Days"].count++;
          categories["Next 30 Days"].projects.push(project.name);
        } else {
          categories["Later"].count++;
          categories["Later"].projects.push(project.name);
        }
      }
    });

    return Object.keys(categories).map(key => ({
      name: key,
      count: categories[key].count,
      fill: categories[key].fill,
      projectNames: categories[key].projects,
    }));
  };

  const data = categorizeProjects(projects);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as CategorizedProjectData;
      return (
        <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
          <p className="text-sm font-semibold mb-1">{label} ({dataPoint.count} projects)</p>
          {dataPoint.projectNames.length > 0 ? (
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {dataPoint.projectNames.map((projectName, index) => (
                <li key={index}>{projectName}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No projects in this category.</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Projects Due Soon</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
            <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
              content={<CustomTooltip />} // Use the custom tooltip
            />
            <Bar dataKey="count" fill="var(--fill)" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Overview of open projects categorized by their due dates.
        </p>
      </CardContent>
    </Card>
  );
};

export default SoonDueProjectsGraph;