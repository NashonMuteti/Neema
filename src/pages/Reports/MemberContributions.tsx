"use client";

import React from "react";

const MemberContributions = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Member Contributions per Project</h1>
      <p className="text-lg text-muted-foreground">
        View detailed reports on member contributions across various projects.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Contribution Data</h2>
        <p className="text-muted-foreground">This section will display charts and tables of member contributions.</p>
      </div>
    </div>
  );
};

export default MemberContributions;