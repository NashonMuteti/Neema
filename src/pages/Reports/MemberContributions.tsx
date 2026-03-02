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
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";
import DateRangePicker from "@/components/reports/DateRangePicker";
import { DateRange } from "react-day-picker";

interface MemberObligationsRow {
  member_id: string;
  member_name: string;
  member_email: string;
  total_owed: number;
  total_paid: number;
  total_due: number;
}

const MemberContributions = () => {
  const { currency } = useSystemSettings();

  const defaultRange = React.useMemo<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }, []);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);

  const [rows, setRows] = React.useState<MemberObligationsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;

    if (!from || !to) {
      setRows([]);
      setLoading(false);
      return;
    }

    // make sure the end includes the full day
    to.setHours(23, 59, 59, 999);

    const { data, error } = await supabase.rpc("get_member_obligations_summary", {
      p_start_date: from.toISOString(),
      p_end_date: to.toISOString(),
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
  }, [dateRange?.from, dateRange?.to, debouncedSearchQuery]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const periodLabel = React.useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";
    return `${fromStr} - ${toStr}`;
  }, [dateRange?.from, dateRange?.to]);

  const subtitle = `Period: ${periodLabel}${debouncedSearchQuery ? ` • Search: ${debouncedSearchQuery}` : ""}`;

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
        Summary of member obligations (pledges) and payments for a selected date range.
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
            columns={[
              "Member Name",
              "Total owed (all obligations)",
              "Total paid (all obligations)",
              "Due to pay",
            ]}
            rows={[
              ...rows.map((r) => [
                r.member_name,
                money(r.total_owed),
                money(r.total_paid),
                money(r.total_due),
              ]),
              ["TOTAL", money(totals.owed), money(totals.paid), money(totals.due)],
            ]}
          />
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-1.5">
                <Label>Date range</Label>
                <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[280px]" />
              </div>

              <div className="relative flex items-center">
                <Input
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
                  <TableHead className="text-right">Total owed (all obligations)</TableHead>
                  <TableHead className="text-right">Total paid (all obligations)</TableHead>
                  <TableHead className="text-right">Due to pay</TableHead>
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
              No records found for the selected date range or matching your search.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberContributions;