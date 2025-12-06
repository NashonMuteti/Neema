"use client";

import React from "react";

const PettyCashReport = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures Report</h1>
      <p className="text-lg text-muted-foreground">
        Generate reports on all petty cash transactions and spending patterns.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Expenditure Summary</h2>
        <p className="text-muted-foreground">This section will show a summary and detailed list of petty cash expenses.</p>
      </div>
    </div>
  );
};

export default PettyCashReport;