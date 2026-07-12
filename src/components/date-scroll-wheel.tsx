"use client";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { parseISODate } from "@/lib/date-iso";
import { cn } from "@/lib/utils";

const LINE_HEIGHT_PX = 36;
const VISIBLE_RADIUS = 2;
const WHEEL_DELTA_PER_DATE = 120;
const FADE_IDLE_MS = 1100;
const DRAG_STEP_PX = 36;
const CLICK_SLOP_PX = 6;

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatWheelLine(iso: string, today: string) {
  const d = parseISODate(iso);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (iso === today) {
    return { isToday: true, label: "Today", dateLabel };
  }
  return { isToday: false, label: dateLabel, dateLabel: null };
}

export function DateScrollWheel({
  dates,
  selectedDate,
  onSelect,
  today,
  activityKey = 0,
  className,
}: {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
  today: string;
  /** Increment when dates change outside this control (schedule scroll, keys, calendar). */
  activityKey?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepAccumulatorRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number | null;
    startY: number;
    lastY: number;
    startDate: string | null;
    dragged: boolean;
  }>({
    pointerId: null,
    startY: 0,
    lastY: 0,
    startDate: null,
    dragged: false,
  });
  const [visible, setVisible] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const [isDragging, setIsDragging] = useState(false);

  const selectedIndex = dates.indexOf(selectedDate);

  const visibleDates = useMemo(() => {
    if (dates.length === 0) return [];
    const i = selectedIndex === -1 ? 0 : selectedIndex;
    const start = Math.max(0, i - VISIBLE_RADIUS);
    const end = Math.min(dates.length, i + VISIBLE_RADIUS + 1);
    return dates.slice(start, end);
  }, [dates, selectedIndex]);

  const show = useCallback(() => {
    setVisible(true);
    if (reduceMotion) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, FADE_IDLE_MS);
  }, [reduceMotion]);

  const advance = useCallback(
    (delta: number) => {
      if (delta === 0) return;
      show();
      const i = dates.indexOf(selectedDate);
      const safeI = i === -1 ? 0 : i;
      const next = Math.max(0, Math.min(dates.length - 1, safeI + delta));
      const nextDate = dates[next];
      if (nextDate && nextDate !== selectedDate) onSelect(nextDate);
    },
    [dates, onSelect, selectedDate, show]
  );

  useEffect(() => {
    if (activityKey > 0) queueMicrotask(() => show());
  }, [activityKey, show]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let wheelAccumulator = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(e.deltaY) < 1) return;
      wheelAccumulator += e.deltaY;

      while (wheelAccumulator >= WHEEL_DELTA_PER_DATE) {
        advance(1);
        wheelAccumulator -= WHEEL_DELTA_PER_DATE;
      }
      while (wheelAccumulator <= -WHEEL_DELTA_PER_DATE) {
        advance(-1);
        wheelAccumulator += WHEEL_DELTA_PER_DATE;
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [advance]);

  const endDrag = useCallback(
    (pointerId: number) => {
      const s = dragRef.current;
      if (s.pointerId !== pointerId) return;

      if (!s.dragged && s.startDate) {
        show();
        onSelect(s.startDate);
      }

      dragRef.current = {
        pointerId: null,
        startY: 0,
        lastY: 0,
        startDate: null,
        dragged: false,
      };
      stepAccumulatorRef.current = 0;
      setIsDragging(false);
      rootRef.current?.releasePointerCapture(pointerId);
    },
    [onSelect, show]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-date]"
      );
      if (!btn) return;

      const iso = btn.dataset.date;
      if (!iso) return;

      show();
      dragRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        lastY: e.clientY,
        startDate: iso,
        dragged: false,
      };
      stepAccumulatorRef.current = 0;
      rootRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [show]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = dragRef.current;
      if (s.pointerId !== e.pointerId) return;

      const dy = e.clientY - s.lastY;
      s.lastY = e.clientY;

      if (Math.abs(e.clientY - s.startY) > CLICK_SLOP_PX) {
        if (!s.dragged) {
          s.dragged = true;
          setIsDragging(true);
        }
      }

      if (!s.dragged) return;

      stepAccumulatorRef.current += dy;

      while (stepAccumulatorRef.current >= DRAG_STEP_PX) {
        advance(1);
        stepAccumulatorRef.current -= DRAG_STEP_PX;
      }
      while (stepAccumulatorRef.current <= -DRAG_STEP_PX) {
        advance(-1);
        stepAccumulatorRef.current += DRAG_STEP_PX;
      }
    },
    [advance]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  if (visibleDates.length === 0) return null;

  const isShown = reduceMotion || visible;

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "flex w-full flex-none touch-none select-none flex-col justify-center self-center overflow-hidden",
        "transition-opacity duration-300 ease-out",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isShown
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
        className
      )}
      aria-label="Date selector"
      aria-hidden={!isShown}
    >
      <div
        className="flex flex-col items-center"
        style={{ minHeight: LINE_HEIGHT_PX * (VISIBLE_RADIUS * 2 + 1) }}
      >
        {visibleDates.map((iso) => {
          const index = dates.indexOf(iso);
          const distance =
            selectedIndex === -1
              ? index === 0
                ? 0
                : 99
              : Math.abs(index - selectedIndex);
          const isSelected = iso === selectedDate;
          const { isToday, label, dateLabel } = formatWheelLine(iso, today);
          const proximity = Math.min(distance, 2);

          return (
            <button
              key={iso}
              type="button"
              data-date={iso}
              style={{ height: LINE_HEIGHT_PX }}
              className={cn(
                "flex w-full min-w-0 items-center justify-center overflow-hidden border-0 bg-transparent px-1 text-center leading-tight transition-[color,opacity] duration-300 ease-out select-none",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isSelected
                  ? "text-sm font-semibold text-foreground"
                  : proximity === 1
                    ? "text-xs text-muted-foreground/55"
                    : "text-[11px] text-muted-foreground/35"
              )}
              aria-current={isSelected ? "date" : undefined}
            >
              {isToday ? (
                <span className="flex min-w-0 items-baseline justify-center gap-1 truncate select-none">
                  <span className="shrink-0 font-semibold uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="truncate">{dateLabel}</span>
                </span>
              ) : (
                <span className="w-full truncate select-none">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
