"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Stocks = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Stocks Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage inventory, stock levels, and product availability.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Current Stock Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display a list of all products, their current stock levels, and reorder points.
            Functionality for adding new stock, updating quantities, and viewing stock history will be available here.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            (Placeholder content for future implementation)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stocks;