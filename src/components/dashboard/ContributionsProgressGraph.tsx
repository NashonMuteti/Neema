"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProjectContributionData {
  name: string;
  expected: number;
  actual: number;
}

interface ContributionsProgressGraphProps {
  projectsData: ProjectContributionData[];
}

const ContributionsProgressGraph: React.FC<ContributionsProgressGraphProps> = ({
  projectsData,
}) => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Contribution Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={projectsData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
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
            <Legend />
            <Bar dataKey="expected" fill="hsl(var(--primary))" name="Expected" />
            <Bar dataKey="actual" fill="hsl(var(--secondary))" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Comparison of actual contributions against expected targets for active projects.
        </p>
      </CardContent>
    </Card>
  );
};

export default ContributionsProgressGraph;