"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { ContributionBreakdownItem } from "@/types/common";

interface MyContributionsBreakdownTableProps {
  breakdownItems: ContributionBreakdownItem[];
  loading: boolean;
  error: string | null;
  overallTotalContributed: number;
  overallBalanceToPay: number;
}

const MyContributionsBreakdownTable: React.FC<MyContributionsBreakdownTableProps> = ({
  breakdownItems,
  loading,
  error,
  overallTotalContributed,
  overallBalanceToPay,
}) => {
  const { currency } = useSystemSettings();

  if (loading) {
    return <p className="text-muted-foreground">Loading breakdown summary...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  const getStatusBadgeClasses = (status?: ContributionBreakdownItem["status"]) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Outstanding":
      case "Partially Paid":
      case "Overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const groupedItems: { [key in ContributionBreakdownItem["type"]]?: ContributionBreakdownItem[] } = {
    Project: [],
    Pledge: [],
    Debt: [],
  };

  breakdownItems.forEach((item) => {
    groupedItems[item.type]?.push(item);
  });

  const totalExpected = breakdownItems.reduce((sum, item) => sum + item.expectedAmount, 0);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Breakdown Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdownItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Expected Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(groupedItems).map((typeKey) => {
                const type = typeKey as ContributionBreakdownItem["type"];
                const itemsOfType = groupedItems[type] || [];

                if (itemsOfType.length === 0) return null;

                const subtotalExpected = itemsOfType.reduce((sum, item) => sum + item.expectedAmount, 0);
                const subtotalPaid = itemsOfType.reduce((sum, item) => sum + item.paidAmount, 0);
                const subtotalBalanceDue = itemsOfType.reduce((sum, item) => sum + item.balanceDue, 0);

                return (
                  <React.Fragment key={type}>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 font-semibold">
                      <TableCell colSpan={7} className="text-left text-lg py-3">
                        {type}s
                      </TableCell>
                    </TableRow>
                    {itemsOfType.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right">
                          {currency.symbol}
                          {item.expectedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {currency.symbol}
                          {item.paidAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currency.symbol}
                          {item.balanceDue.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {item.dueDate ? format(item.dueDate, "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status ? (
                            <Badge className={getStatusBadgeClasses(item.status)}>
                              {item.status}
                            </Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={2} className="text-right">
                        Subtotal {type}s
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {subtotalExpected.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {subtotalPaid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {subtotalBalanceDue.toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              <TableRow className="font-bold bg-primary/10 hover:bg-primary/10 text-primary-foreground">
                <TableCell colSpan={2}>Grand Totals</TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {totalExpected.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {overallTotalContributed.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {currency.symbol}
                  {overallBalanceToPay.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">No breakdown items found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyContributionsBreakdownTable;