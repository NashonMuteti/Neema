"use client";

import React from "react";

const Pledges = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
      <p className="text-lg text-muted-foreground">
        Record and track financial commitments (pledges) from members for various projects.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">New Pledge Form</h2>
        <p className="text-muted-foreground">This section will contain a form to add new pledges.</p>
        {/* Placeholder for a form to add new pledges */}
      </div>
    </div>
  );
};

export default Pledges;