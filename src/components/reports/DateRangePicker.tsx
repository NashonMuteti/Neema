"use client";

import * as React from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  className?: string;
};

export default function DateRangePicker({ value, onChange, className }: Props) {
  const label = React.useMemo(() => {
    if (!value?.from && !value?.to) return "Pick a date range";
    if (value.from && !value.to) return format(value.from, "PPP");
    if (value.from && value.to) return `${format(value.from, "PPP")} — ${format(value.to, "PPP")}`;
    return "Pick a date range";
  }, [value?.from, value?.to]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", !value?.from && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
