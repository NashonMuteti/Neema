"use client";

import React from "react";

const Index = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to your cinematic financial management hub.
      </p>

      {/* Placeholder for Dashboard content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Active Accounts</h2>
          <p className="text-muted-foreground">Summary of active project contributions and deficits.</p>
          {/* More content will go here */}
        </div>
        <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Weekly Summary</h2>
          <p className="text-muted-foreground">Collections vs. expenses for the current week.</p>
          {/* More content will go here */}
        </div>
        <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Monthly Summary</h2>
          <p className="text-muted-foreground">Collections vs. expenses for the current month.</p>
          {/* More content will go here */}
        </div>
      </div>
    </div>
  );
};

export default Index;