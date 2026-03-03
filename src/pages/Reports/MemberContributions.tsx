"use client";

import React, { useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";

interface MemberObligationsRow {
  member_id: string;
  member_name: string;
  member_email: string;
  total_owed: number;
  total_paid: number;
  total_due: number;
}

const owedHeader = "Total owed (Expected(active projects) + Pledges + Debts)";
const paidHeader = "Total paid (Collections + Paid pledges + Paid debts)";

const MemberContributions = () => {
  const { currency } = useSystemSettings();

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);

  const [rows, setRows] = React.useState<MemberObligationsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("get_member_obligations_summary_current", {
      p_search_query: debouncedSearchQuery,
    });

    if (error) {
      console.error("Error fetching member obligations summary:", error);
      setError("Failed to load contributions summary.");
      showError("Failed to load contributions summary.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as MemberObligationsRow[]);
    setLoading(false);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const subtitle = "Scope: Active members only • Projects: Open only" +
    (debouncedSearchQuery ? ` • Search: ${debouncedSearchQuery}` : "");

  const totals = React.useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.owed += Number(r.total_owed || 0);
        acc.paid += Number(r.total_paid || 0);
        acc.due += Number(r.total_due || 0);
        return acc;
      },
      { owed: 0, paid: 0, due: 0 },
    );
  }, [rows]);

  const money = (v: number) => `${currency.symbol}${Number(v || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Contributions Summary Report</h1>
        <p className="text-lg text-muted-foreground">Loading report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Contributions Summary Report</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Contributions Summary Report</h1>
      <p className="text-lg text-muted-foreground">
        Summary of member obligations and payments across all open projects, pledges, and debts.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Contributions Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          <ReportActions
            title="Contributions Summary Report"
            subtitle={subtitle}
            columns={["Member Name", owedHeader, paidHeader, "Due to pay (Owed - Paid)"]}
            rows={[
              ...rows.map((r) => [r.member_name, money(r.total_owed), money(r.total_paid), money(r.total_due)]),
              ["TOTAL", money(totals.owed), money(totals.paid), money(totals.due)],
            ]}
          />
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="relative flex items-center">
                <Label className="sr-only" htmlFor="contrib-summary-search">Search member</Label>
                <Input
                  id="contrib-summary-search"
                  type="text"
                  placeholder="Search member..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead className="text-right">{owedHeader}</TableHead>
                  <TableHead className="text-right">{paidHeader}</TableHead>
                  <TableHead className="text-right">Due to pay (Owed - Paid)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.member_id}>
                    <TableCell className="font-medium">{r.member_name}</TableCell>
                    <TableCell className="text-right font-medium">{money(r.total_owed)}</TableCell>
                    <TableCell className="text-right font-medium">{money(r.total_paid)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{money(r.total_due)}</TableCell>
                  </TableRow>
                ))}

                <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{money(totals.owed)}</TableCell>
                  <TableCell className="text-right">{money(totals.paid)}</TableCell>
                  <TableCell className="text-right text-primary">{money(totals.due)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">
              No active members found matching your search.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributions;