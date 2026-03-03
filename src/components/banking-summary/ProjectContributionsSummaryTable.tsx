"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/context/SystemSettingsContext";

export type ProjectContributionTxRow = {
  id: string;
  project_id: string;
  project_name: string;
  date: string;
  amount: number;
};

type Props = {
  rows: Array<{ project_id: string; project_name: string; total: number }>;
  tx: ProjectContributionTxRow[];
  grandTotal: number;
  getPeriodLabel: () => string;
};

export default function ProjectContributionsSummaryTable({
  rows,
  tx,
  grandTotal,
  getPeriodLabel,
}: Props) {
  const { currency } = useSystemSettings();
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  const toggleRow = (projectId: string) => {
    setOpenRows((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  return (
    <>
      <h3 className="text-xl font-semibold mb-2">Active Project Contributions for {getPeriodLabel()}</h3>
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Total Contributions</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const projectTx = tx.filter((t) => t.project_id === r.project_id);
              const isOpen = !!openRows[r.project_id];
              const canExpand = projectTx.length > 0;

              return (
                <React.Fragment key={r.project_id}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium">{r.project_name}</TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}
                      {r.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {canExpand ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRow(r.project_id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide contribution transactions" : "Show contribution transactions"}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isOpen && "rotate-180",
                            )}
                          />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>

                  {canExpand && isOpen ? (
                    <TableRow>
                      <TableCell colSpan={3} className="p-0">
                        <div className="py-2 pl-8 pr-4 bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2">Collection Transactions:</h4>
                          <Table className="w-full text-sm">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[140px]">Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectTx.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell>{format(parseISO(t.date), "MMM dd, yyyy")}</TableCell>
                                  <TableCell className="text-right">
                                    {currency.symbol}
                                    {Number(t.amount || 0).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}

            <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
              <TableCell>Grand Total Contributions</TableCell>
              <TableCell className="text-right">
                {currency.symbol}
                {grandTotal.toFixed(2)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center mt-4">
          No contributions found for active projects in the selected period.
        </p>
      )}
    </>
  );
}
