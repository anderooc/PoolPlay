"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatISODateLabel,
  getCalendarMonthBounds,
  parseISODate,
  toISODate,
} from "@/lib/date-iso";
import { cn } from "@/lib/utils";

/** Tighter layout via CSS vars only — avoids overriding required flex/grid classNames. */
const COMPACT_CALENDAR_CLASS =
  "p-1.5 [--cell-size:1.625rem] [--cell-radius:var(--radius-sm)]";

export type DatePickerCalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  /** ISO dates (YYYY-MM-DD) that extend the year dropdown when scheduled later. */
  rangeFromDates?: string[];
  /** Dates highlighted with a dot (e.g. days that have tournaments). */
  markedDates?: Date[];
  month?: Date;
  onMonthChange?: (month: Date) => void;
  className?: string;
  autoFocus?: boolean;
};

/** Shared PoolPlay calendar: month/year dropdowns, current-year start, no outside days. */
export function DatePickerCalendar({
  selected,
  onSelect,
  rangeFromDates = [],
  markedDates,
  month: monthProp,
  onMonthChange,
  className,
  autoFocus,
}: DatePickerCalendarProps) {
  const { startMonth, endMonth, today } = useMemo(
    () => getCalendarMonthBounds(rangeFromDates),
    [rangeFromDates]
  );

  const [internalMonth, setInternalMonth] = useState(() =>
    selected ?? parseISODate(today)
  );
  const month = monthProp ?? internalMonth;
  const setMonth = onMonthChange ?? setInternalMonth;

  useEffect(() => {
    if (monthProp !== undefined) return;
    if (selected) setInternalMonth(selected);
  }, [selected, monthProp]);

  return (
    <Calendar
      mode="single"
      showOutsideDays={false}
      captionLayout="dropdown"
      navLayout="after"
      hideNavigation
      reverseYears
      startMonth={startMonth}
      endMonth={endMonth}
      month={month}
      onMonthChange={setMonth}
      selected={selected}
      onSelect={onSelect}
      modifiers={
        markedDates?.length ? { marked: markedDates } : undefined
      }
      modifiersClassNames={{
        marked:
          "relative after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
      }}
      className={cn(COMPACT_CALENDAR_CLASS, className)}
      autoFocus={autoFocus}
    />
  );
}

type DatePickerFieldProps = {
  id?: string;
  label?: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** For native form posts (e.g. create tournament). */
  name?: string;
  required?: boolean;
  markedDates?: Date[];
  rangeFromDates?: string[];
  className?: string;
};

/** Form field: labeled trigger opens the shared calendar in a popover. */
export function DatePickerField({
  id,
  label,
  value,
  onChange,
  disabled,
  name,
  required,
  markedDates,
  rangeFromDates = [],
  className,
}: DatePickerFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() =>
    value ? parseISODate(value) : new Date()
  );

  const displayLabel = value
    ? formatISODateLabel(value, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pick a date";

  useEffect(() => {
    if (!open) return;
    setMonth(value ? parseISODate(value) : new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange(toISODate(date));
    setOpen(false);
    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}
      {label && <Label htmlFor={id}>{label}</Label>}
      <div ref={containerRef} className="relative">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground"
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <CalendarIcon className="h-4 w-4" />
          {displayLabel}
        </Button>
        {open && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 z-50 w-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            role="dialog"
            aria-label="Choose date"
          >
            <DatePickerCalendar
              selected={value ? parseISODate(value) : undefined}
              onSelect={handleSelect}
              markedDates={markedDates}
              rangeFromDates={
                value ? [...rangeFromDates, value] : rangeFromDates
              }
              month={month}
              onMonthChange={setMonth}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
