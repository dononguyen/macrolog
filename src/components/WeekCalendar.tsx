"use client";

import { useEffect, useRef } from "react";
import { fromKey, shiftKey, todayKey } from "@/lib/date";

/** How far the strip runs either side of today. */
const DAYS_BACK = 120;
const DAYS_AHEAD = 7;

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A scrolling strip of days, newest at the right. The selected day is a filled
 * pill; days you have logged carry a dot, so the strip doubles as a record of
 * where the gaps are.
 */
export function WeekCalendar({
  selected,
  loggedDates,
  onSelect,
}: {
  selected: string;
  loggedDates: Set<string>;
  onSelect: (date: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);

  const today = todayKey();
  const days = Array.from(
    { length: DAYS_BACK + DAYS_AHEAD + 1 },
    (_, i) => shiftKey(today, i - DAYS_BACK),
  );

  // Keep the chosen day in view, including when it changes from elsewhere on
  // the page. The first pass jumps: today starts four months along the strip,
  // and animating that distance on load reads as the page still loading.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: mounted.current ? "smooth" : "instant",
      inline: "center",
      block: "nearest",
    });
    mounted.current = true;
  }, [selected]);

  return (
    <div
      className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6"
    >
      {days.map((date) => {
        const isSelected = date === selected;
        const isToday = date === today;
        const d = fromKey(date);
        const logged = loggedDates.has(date);

        return (
          <button
            key={date}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelect(date)}
            aria-current={isSelected ? "date" : undefined}
            aria-label={d.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            className={`pressable flex w-[3.25rem] shrink-0 flex-col items-center gap-1 rounded-2xl py-2.5 ${
              isSelected
                ? "bg-accent text-on-accent"
                : "text-muted hover:bg-sunken"
            }`}
          >
            <span className="text-[11px] font-medium uppercase">
              {WEEKDAY[d.getDay()]}
            </span>
            <span
              className={`tabular text-base font-semibold ${
                isSelected ? "" : isToday ? "text-accent-text" : "text-fg"
              }`}
            >
              {d.getDate()}
            </span>
            {/* A logged day gets a dot; today gets one too so it stays findable
                after you scroll away from it. */}
            <span
              aria-hidden="true"
              className={`size-1 rounded-full ${
                logged
                  ? isSelected
                    ? "bg-on-accent"
                    : "bg-accent"
                  : isToday && !isSelected
                    ? "bg-border-strong"
                    : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
