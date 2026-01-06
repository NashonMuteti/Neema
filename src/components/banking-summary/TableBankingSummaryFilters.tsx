"use client";

import React from "react";
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
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MonthYearOption } from "@/types/common";
import { Button } from "@/components/ui/button"; // Added Button import

interface TableBankingSummaryFiltersProps {
  filterPeriod: "daily" | "weekly" | "monthly" | "yearly";
  setFilterPeriod: (period: "daily" | "weekly" | "monthly" | "yearly") => void;
  selectedDate?: Date;
  setSelectedDate: (date?: Date) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  months: MonthYearOption[];
  years: MonthYearOption[];
}

const TableBankingSummaryFilters: React.FC<TableBankingSummaryFiltersProps> = ({
  filterPeriod,
  setFilterPeriod,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  months,
  years,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <div className="grid gap-1.5">
        <Label htmlFor="table-banking-filter-period">View By</Label>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
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
  );
};

export default TableBankingSummaryFilters;