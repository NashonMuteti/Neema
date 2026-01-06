"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  format,
  getMonth,
  getYear,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react"; // Added ChevronDown icon
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"; // Import Collapsible components
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { FinancialAccount, MonthYearOption, DebtRow } from "@/types/common"; // Updated import
import { Debt } from "@/components/sales-management/AddEditDebtDialog"; // Import Debt interface

interface ProjectCollection {
  id: string;
  date: string; // ISO string
  amount: number;
  project_id: string;
  member_id: string;
  account_id: string; // This is the key for grouping
}

const TableBankingSummary: React.FC = () => {
  const { currency } = useSystemSettings(); // Use currency from context
  const { currentUser } = useAuth(); // Use currentUser to filter accounts
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [filterPeriod, setFilterPeriod] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({}); // State for open collapsibles

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [allCollections, setAllCollections] = React.useState<ProjectCollection[]>([]);
  const [debts, setDebts] = React.useState<Debt[]>([]); // New state for debts
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const months: MonthYearOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years: MonthYearOption[] = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchTableBankingData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data: accountsData, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id') // Added initial_balance and profile_id
      .eq('profile_id', currentUser.id) // Filter by current user's profile_id
      .order('name', { ascending: true });

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      setError("Failed to load financial accounts.");
      setFinancialAccounts([]);
    } else {
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);
    }

    const { data: collectionsData, error: collectionsError } = await supabase
      .from('project_collections')
      .select('id, date, amount, project_id, member_id, account_id')
      .order('date', { ascending: false });

    if (collectionsError) {
      console.error("Error fetching project collections:", collectionsError);
      setError("Failed to load project collections.");
      setAllCollections([]);
    } else {
      setAllCollections(collectionsData || []);
    }

    // New: Fetch Debts
    let debtsQuery = supabase
      .from('debts')
      .select(`
        id,
        description,
        original_amount,
        amount_due,
        due_date,
        status,
        debtor_profile_id,
        customer_name,
        profiles!debts_debtor_profile_id_fkey(name, email)
      `);
    
    // Filter debts by current user if not admin
    if (!isAdmin) {
      debtsQuery = debtsQuery.or(`created_by_profile_id.eq.${currentUser.id},debtor_profile_id.eq.${currentUser.id}`);
    }

    const { data: debtsData, error: debtsError } = await debtsQuery.order('due_date', { ascending: false, nullsFirst: false });

    if (debtsError) {
      console.error("Error fetching debts:", debtsError);
      setError("Failed to load debts.");
      setDebts([]);
    } else {
      setDebts((debtsData || []).map((d: any) => ({
        id: d.id,
        created_by_profile_id: d.created_by_profile_id,
        sale_id: d.sale_id || undefined,
        debtor_profile_id: d.debtor_profile_id || undefined,
        customer_name: d.customer_name || undefined,
        description: d.description,
        original_amount: d.original_amount,
        amount_due: d.amount_due,
        due_date: d.due_date ? parseISO(d.due_date) : undefined,
        status: d.status,
        notes: d.notes || undefined,
        created_at: parseISO(d.created_at || new Date().toISOString()),
        created_by_name: d.profiles!debts_created_by_profile_id_fkey?.name || d.profiles!debts_created_by_profile_id_fkey?.email || 'N/A',
        debtor_name: d.profiles!debts_debtor_profile_id_fkey?.name || d.profiles!debts_debtor_profile_id_fkey?.email || d.customer_name || 'N/A',
        sale_description: d.sales_transactions?.notes || undefined,
      })));
    }

    setLoading(false);
  }, [currentUser, isAdmin, filterPeriod, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTableBankingData();
  }, [fetchTableBankingData]);

  const getPeriodInterval = (period: typeof filterPeriod, date?: Date, month?: string, year?: string) => {
    let start: Date;
    let end: Date;

    switch (period) {
      case "daily":
        start = startOfDay(date || new Date());
        end = endOfDay(date || new Date());
        break;
      case "weekly":
        // Week starts on Monday (locale 0 is Sunday, 1 is Monday)
        start = startOfWeek(date || new Date(), { weekStartsOn: 1 });
        end = endOfWeek(date || new Date(), { weekStartsOn: 1 });
        break;
      case "monthly":
        const monthDate = new Date(parseInt(year || currentYear.toString()), parseInt(month || currentMonth.toString()));
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        break;
      case "yearly":
        const yearDate = new Date(parseInt(year || currentYear.toString()), 0);
        start = startOfYear(yearDate);
        end = endOfYear(yearDate);
        break;
    }
    return { start, end };
  };

  const { start, end } = React.useMemo(() => {
    return getPeriodInterval(filterPeriod, selectedDate, selectedMonth, selectedYear);
  }, [filterPeriod, selectedDate, selectedMonth, selectedYear, currentYear, currentMonth]);

  const filteredCollections = React.useMemo(() => {
    return allCollections.filter(collection => {
      const collectionDate = parseISO(collection.date);
      return isWithinInterval(collectionDate, { start, end });
    });
  }, [allCollections, start, end]);

  const groupedContributions = React.useMemo(() => {
    const groups: Record<string, number> = {};
    filteredCollections.forEach(collection => {
      groups[collection.account_id] = (groups[collection.account_id] || 0) + collection.amount;
    });
    return groups;
  }, [filteredCollections]);

  const grandTotal = Object.values(groupedContributions).reduce((sum, amount) => sum + amount, 0);

  const filteredDebts = React.useMemo(() => {
    return debts.filter(debt => {
      const debtDate = debt.due_date || debt.created_at; // Use due_date or created_at for filtering
      if (!debtDate) return false;
      return isWithinInterval(debtDate, { start, end });
    });
  }, [debts, start, end]);

  const totalOutstandingDebts = filteredDebts.reduce((sum, debt) => sum + debt.amount_due, 0);

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case "daily":
        return selectedDate ? format(selectedDate, "PPP") : "Select a date";
      case "weekly":
        return selectedDate ? `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}` : "Select a date";
      case "monthly":
        return `${months[parseInt(selectedMonth)].label} ${selectedYear}`;
      case "yearly":
        return selectedYear;
      default:
        return "";
    }
  };

  const toggleCollapsible = (accountId: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
        <p className="text-lg text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Table Banking Summary</h1>
      <p className="text-lg text-muted-foreground">
        View a summary of all contributions per financial account, filtered by various time periods.
      </p>

      <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
        <CardHeader>
          <CardTitle>Contributions Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="table-banking-filter-period">View By</Label>
              <Select value={filterPeriod} onValueChange={(value: typeof filterPeriod) => setFilterPeriod(value)}>
                <SelectTrigger id="table-banking-filter-period" className="w-[150px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {(filterPeriod === "daily" || filterPeriod === "weekly") && (
              <div className="grid gap-1.5">
                <Label htmlFor="table-banking-select-date">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      id="table-banking-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filterPeriod === "monthly" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="table-banking-filter-month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="table-banking-filter-month" className="w-[120px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="table-banking-filter-year">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="table-banking-filter-year" className="w-[100px]">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filterPeriod === "yearly" && (
              <div className="grid gap-1.5">
                <Label htmlFor="table-banking-filter-year-yearly">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="table-banking-filter-year-yearly" className="w-[100px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">Summary for {getPeriodLabel()}</h3>
          {Object.keys(groupedContributions).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Financial Account</TableHead>
                  <TableHead className="text-right">Total Contributions</TableHead>
                  <TableHead className="w-[40px]"></TableHead> {/* For the chevron icon */}
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
                  <TableCell>Grand Total Collections</TableCell> {/* Updated label */}
                  <TableCell className="text-right">{currency.symbol}{grandTotal.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No contributions found for the selected period.</p>
          )}

          {/* New: Debts Summary Section */}
          <h3 className="text-xl font-semibold mb-2 mt-6">Debts Overview for {getPeriodLabel()}</h3>
          {filteredDebts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debtor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.debtor_name}</TableCell>
                    <TableCell>{debt.description}</TableCell>
                    <TableCell>{debt.due_date ? format(debt.due_date, "MMM dd, yyyy") : "N/A"}</TableCell>
                    <TableCell className="text-right">{currency.symbol}{debt.amount_due.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${debt.status === "Paid" ? "text-green-600" : debt.status === "Overdue" ? "text-destructive" : "text-yellow-600"}`}>
                        {debt.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={3}>Total Outstanding Debts</TableCell>
                  <TableCell className="text-right">{currency.symbol}{totalOutstandingDebts.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No debts found for the selected period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBankingSummary;