"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { addDays, isBefore, isAfter, startOfDay } from "date-fns";

interface Project {
  id: string;
  name: string;
  dueDate?: Date;
  status: "Open" | "Closed" | "Deleted";
}

interface SoonDueProjectsGraphProps {
  projects: Project[];
}

const SoonDueProjectsGraph: React.FC<SoonDueProjectsGraphProps> = ({ projects }) => {
  const today = startOfDay(new Date());
  const sevenDaysFromNow = addDays(today, 7);
  const thirtyDaysFromNow = addDays(today, 30);

  const categorizeProjects = (allProjects: Project[]) => {
    let dueThisWeek = 0;
    let dueNext30Days = 0;
    let dueLater = 0;
    let overdue = 0;

    allProjects.forEach(project => {
      if (project.status === "Open" && project.dueDate) {
        const dueDate = startOfDay(new Date(project.dueDate));
        if (isBefore(dueDate, today)) {
          overdue++;
        } else if (isBefore(dueDate, sevenDaysFromNow)) {
          dueThisWeek++;
        } else if (isBefore(dueDate, thirtyDaysFromNow)) {
          dueNext30Days++;
        } else {
          dueLater++;
        }
      }
    });

    return [
      { name: "Overdue", count: overdue, fill: "hsl(var(--destructive))" },
      { name: "This Week", count: dueThisWeek, fill: "hsl(var(--primary))" },
      { name: "Next 30 Days", count: dueNext30Days, fill: "hsl(var(--secondary))" },
      { name: "Later", count: dueLater, fill: "hsl(var(--muted-foreground))" },
    ];
  };

  const data = categorizeProjects(projects);

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full lg:col-span-2">
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
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
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