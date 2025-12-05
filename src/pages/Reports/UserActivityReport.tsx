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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dummyUserActivity = [
  { id: "ua1", user: "Alice Johnson", action: "Logged in", timestamp: "2023-10-26 10:00 AM" },
  { id: "ua2", user: "Bob Williams", action: "Edited Project X", timestamp: "2023-10-26 10:15 AM" },
  { id: "ua3", user: "Charlie Brown", action: "Added new pledge", timestamp: "2023-10-26 10:30 AM" },
  { id: "ua4", user: "Alice Johnson", action: "Viewed Petty Cash Report", timestamp: "2023-10-26 11:00 AM" },
];

const UserActivityReport = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">User Activity Report</h1>
      <p className="text-lg text-muted-foreground">
        Track and review all user actions within the application.
      </p>
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Recent User Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyUserActivity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.user}</TableCell>
                  <TableCell>{activity.action}</TableCell>
                  <TableCell>{activity.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityReport;