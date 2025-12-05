"use client";

import React from "react";

const Members = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Members</h1>
      <p className="text-lg text-muted-foreground">
        View and manage all members of your organization.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Member List</h2>
        <p className="text-muted-foreground">This section will display a list of all registered members.</p>
      </div>
    </div>
  );
};

export default Members;