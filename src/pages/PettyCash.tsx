"use client";

import React from "react";

const PettyCash = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Petty Cash Expenditures</h1>
      <p className="text-lg text-muted-foreground">
        Track and manage all petty cash expenses.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Expense Log</h2>
        <p className="text-muted-foreground">This section will list all petty cash transactions.</p>
      </div>
    </div>
  );
};

export default PettyCash;