"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const UserProfileSettingsAdmin = () => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>User Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Manage individual user profiles and their permissions.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current User Profile</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Access and modify your own profile details.
            </p>
            <Link to="/profile">
              <Button variant="outline">Go to My Profile</Button>
            </Link>
          </div>
          <div>
            <h3 className="font-semibold mb-2">User Management (Admin)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              As an administrator, you can view, edit, and manage other users' accounts and roles.
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