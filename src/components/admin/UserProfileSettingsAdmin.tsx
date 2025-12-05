"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const UserProfileSettingsAdmin = () => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>User Management (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          As an administrator, you can view, edit, and manage other users' accounts, roles, and group permissions.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Manage Individual User Profiles</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Access and modify specific user details, roles, and the groups they can access.
            </p>
            {/* Placeholder for a link to a dedicated user management page */}
            <Button variant="outline" disabled>Manage All Users (Coming Soon)</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileSettingsAdmin;