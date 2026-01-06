"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { FinancialAccount } from "@/types/common";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface ProjectCollection {
  id: string;
  date: string; // ISO string
  amount: number;
  project_id: string;
  member_id: string;
  account_id: string; // This is the key for grouping
}

interface ContributionsSummaryTableProps {
  financialAccounts: FinancialAccount[];
  groupedContributions: Record<string, number>;
  filteredCollections: ProjectCollection[];
  grandTotal: number;
  getPeriodLabel: () => string;
}

const ContributionsSummaryTable: React.FC<ContributionsSummaryTableProps> = ({
  financialAccounts,
  groupedContributions,
  filteredCollections,
  grandTotal,
  getPeriodLabel,
}) => {
  const { currency } = useSystemSettings();
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({});

  const toggleCollapsible = (accountId: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  return (
    <>
      <h3 className="text-xl font-semibold mb-2">Summary for {getPeriodLabel()}</h3>
      {Object.keys(groupedContributions).length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Financial Account</TableHead>
              <TableHead className="text-right">Total Contributions</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financialAccounts.map((account) => {
              const total = groupedContributions[account.id] || 0;
              const accountCollections = filteredCollections.filter(c => c.account_id === account.id);
              const isOpen = openCollapsibles[account.id];

              return (
                <React.Fragment key={account.id}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{total.toFixed(2)}</TableCell>
                    <TableCell>
                      {accountCollections.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => toggleCollapsible(account.id)}>
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                            <span className="sr-only">Toggle details</span>
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </TableCell>
                  </TableRow>
                  {accountCollections.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="p-0">
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <div className="py-2 pl-8 pr-4 bg-muted/30">
                            <h4 className="text-sm font-semibold mb-2">Individual Contributions:</h4>
                            <Table className="w-full text-sm">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[120px]">Date</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {accountCollections.map(collection => (
                                  <TableRow key={collection.id}>
                                    <TableCell>{format(parseISO(collection.date), "MMM dd, yyyy")}</TableCell>
                                    <TableCell className="text-right">{currency.symbol}{collection.amount.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
              <TableCell>Grand Total Collections</TableCell>
              <TableCell className="text-right">{currency.symbol}{grandTotal.toFixed(2)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center mt-4">No contributions found for the selected period.</p>
      )}
    </>
  );
};

export default ContributionsSummaryTable;