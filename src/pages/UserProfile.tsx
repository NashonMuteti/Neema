"use client";

import React from "react";

const UserProfile = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">User Profile & Rights</h1>
      <p className="text-lg text-muted-foreground">
        Manage your profile information and control user permissions.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Profile Details</h2>
        <p className="text-muted-foreground">Edit your personal information and view your roles.</p>
      </div>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p className="text-muted-foreground">Admin controls for managing other users and their rights.</p>
      </div>
    </div>
  );
};

export default UserProfile;