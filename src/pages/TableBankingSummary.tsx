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

interface FinancialAccount {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  date: string; // ISO string
  amount: number;
  accountId: string;
}

const financialAccounts: FinancialAccount[] = [
  { id: "acc1", name: "Cash at Hand" },
  { id: "acc2", name: "Petty Cash" },
  { id: "acc3", name: "Bank Mpesa Account" },
  { id: "acc4", name: "Main Bank Account" },
];

const dummyCollectionsData: Collection[] = [
  { id: "c1", date: "2024-07-20", amount: 100, accountId: "acc1" },
  { id: "c2", date: "2024-07-20", amount: 50, accountId: "acc2" },
  { id: "c3", date: "2024-07-21", amount: 200, accountId: "acc3" },
  { id: "c4", date: "2024-07-22", amount: 150, accountId: "acc1" },
  { id: "c5", date: "2024-07-23", amount: 75, accountId: "acc2" },
  { id: "c6", date: "2024-07-24", amount: 300, accountId: "acc4" },
  { id: "c7", date: "2024-07-25", amount: 120, accountId: "acc1" },
  { id: "c8", date: "2024-07-26", amount: 80, accountId: "acc3" },
  { id: "c9", date: "2024-07-27", amount: 180, accountId: "acc4" },
  { id: "c10", date: "2024-07-28", amount: 60, accountId: "acc2" },
  { id: "c11", date: "2024-08-01", amount: 110, accountId: "acc1" },
  { id: "c12", date: "2024-08-02", amount: 90, accountId: "acc3" },
  { id: "c13", date: "2023-12-10", amount: 250, accountId: "acc4" },
  { id: "c14", date: "2023-12-15", amount: 100, accountId: "acc1" },
  { id: "c15", date: "2024-07-20", amount: 20, accountId: "acc1" }, // Another for same day/account
];

const TableBankingSummary: React.FC = () => {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());

  const [filterPeriod, setFilterPeriod] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({}); // State for open collapsibles

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

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
    return dummyCollectionsData.filter(collection => {
      const collectionDate = parseISO(collection.date);
      return isWithinInterval(collectionDate, { start, end });
    });
  }, [dummyCollectionsData, start, end]);

  const groupedContributions = React.useMemo(() => {
    const groups: Record<string, number> = {};
    filteredCollections.forEach(collection => {
      groups[collection.accountId] = (groups[collection.accountId] || 0) + collection.amount;
    });
    return groups;
  }, [filteredCollections]);

  const grandTotal = Object.values(groupedContributions).reduce((sum, amount) => sum + amount, 0);

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
              <Label htmlFor="filter-period">View By</Label>
              <Select value={filterPeriod} onValueChange={(value: typeof filterPeriod) => setFilterPeriod(value)}>
                <SelectTrigger id="filter-period" className="w-[150px]">
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
                <Label htmlFor="select-date">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
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
                  <Label htmlFor="filter-month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="filter-month" className="w-[120px]">
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
                  <Label htmlFor="filter-year">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="filter-year" className="w-[100px]">
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
                <Label htmlFor="filter-year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="filter-year" className="w-[100px]">
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
                  const accountCollections = filteredCollections.filter(c => c.accountId === account.id);
                  const isOpen = openCollapsibles[account.id];

                  return (
                    <React.Fragment key={account.id}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="text-right">${total.toFixed(2)}</TableCell>
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
                                        <TableCell className="text-right">${collection.amount.toFixed(2)}</TableCell>
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
                  <TableCell>Grand Total</TableCell>
                  <TableCell className="text-right">${grandTotal.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center mt-4">No contributions found for the selected period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBankingSummary;