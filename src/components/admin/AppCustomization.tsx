"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandSettings from "./BrandSettings"; // Import the new component

const AppCustomization = () => {
  return (
    <div className="space-y-6">
      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>App Customization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Adjust the application's look and feel, branding, and default behaviors.
          </p>
          {/* Placeholder for app customization forms/options */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="default-theme" className="text-sm font-medium">Default Theme</label>
              {/* Placeholder for a Select component */}
              <span className="text-sm text-muted-foreground">System</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <BrandSettings /> {/* Add the new BrandSettings component */}
    </div>
  );
};

export default AppCustomization;