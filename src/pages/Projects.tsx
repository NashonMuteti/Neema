"use client";

import React from "react";

const Projects = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-foreground">Project Accounts</h1>
      <p className="text-lg text-muted-foreground">
        Manage your project-specific financial contributions and reports here.
      </p>
      <div className="bg-card p-6 rounded-lg shadow-lg border transition-all duration-300 ease-in-out hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Project List</h2>
        <p className="text-muted-foreground">This section will display all projects and allow adding new ones.</p>
      </div>
    </div>
  );
};

export default Projects;