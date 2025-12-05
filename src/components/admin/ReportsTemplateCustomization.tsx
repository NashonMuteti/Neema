"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReportsTemplateCustomization = () => {
  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>Reports Template Customization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Customize the templates and data displayed in various reports.
        </p>
        {/* Placeholder for report template customization forms/options */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="pledge-report-fields" className="text-sm font-medium">Pledge Report Fields</label>
            {/* Placeholder for a Multi-select component */}
            <span className="text-sm text-muted-foreground">Select fields</span>
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="export-format" className="text-sm font-medium">Default Export Format</label>
            {/* Placeholder for a Select component */}
            <span className="text-sm text-muted-foreground">PDF</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsTemplateCustomization;