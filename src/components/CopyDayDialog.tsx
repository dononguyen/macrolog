"use client";

import { useMemo, useState } from "react";
import { labelForKey } from "@/lib/date";
import { addEntries } from "@/lib/store";
import {
  MEAL_LABELS,
  MEAL_SLOTS,
  totalNutrients,
  type Entry,
  type MealSlot,
} from "@/lib/types";
import { Button, EmptyState, Modal } from "./ui";

/**
 * Most days look like some previous day. Picking one and choosing which meals
 * to bring across is the fastest way to log a repeat.
 */
export function CopyDayDialog({
  targetDate,
  entries,
  onClose,
}: {
  targetDate: string;
  entries: Entry[];
  onClose: () => void;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealSlot[]>([...MEAL_SLOTS]);

  /** Days that have something to copy, newest first. */
  const days = useMemo(() => {
    const byDate = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.date === targetDate) continue;
      const list = byDate.get(entry.date) ?? [];
      list.push(entry);
      byDate.set(entry.date, list);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30);
  }, [entries, targetDate]);

  const sourceEntries = source
    ? (days.find(([date]) => date === source)?.[1] ?? [])
    : [];
  const selected = sourceEntries.filter((e) => meals.includes(e.meal));

  if (source) {
    return (
      <Modal
        title={`Copy ${labelForKey(source)}`}
        onClose={onClose}
        footer={
          <Button
            className="w-full"
            disabled={selected.length === 0}
            onClick={() => {
              addEntries(
                selected.map((entry) => ({
                  date: targetDate,
                  meal: entry.meal,
                  food: entry.food,
                  grams: entry.grams,
                })),
              );
              onClose();
            }}
          >
            {selected.length === 0
              ? "Nothing selected"
              : `Copy ${selected.length} item${selected.length === 1 ? "" : "s"}`}
          </Button>
        }
      >
        <div className="p-4">
          <p className="text-sm text-muted">
            Choose which meals to bring across to {labelForKey(targetDate)}.
          </p>

          <ul className="mt-3 space-y-2">
            {MEAL_SLOTS.map((meal) => {
              const mealEntries = sourceEntries.filter((e) => e.meal === meal);
              const checked = meals.includes(meal);
              return (
                <li key={meal}>
                  <label
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      mealEntries.length === 0
                        ? "border-border opacity-50"
                        : "cursor-pointer border-border hover:bg-sunken"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--accent)]"
                      disabled={mealEntries.length === 0}
                      checked={checked && mealEntries.length > 0}
                      onChange={() =>
                        setMeals(
                          checked
                            ? meals.filter((m) => m !== meal)
                            : [...meals, meal],
                        )
                      }
                    />
                    <span className="flex-1 text-sm font-medium">
                      {MEAL_LABELS[meal]}
                    </span>
                    <span className="tabular text-xs text-muted">
                      {mealEntries.length === 0
                        ? "empty"
                        : `${mealEntries.length} item${
                            mealEntries.length === 1 ? "" : "s"
                          } · ${Math.round(
                            totalNutrients(mealEntries).kcal,
                          ).toLocaleString()} kcal`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => setSource(null)}
            className="mt-4 text-sm font-medium text-accent"
          >
            Pick a different day
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Copy a day" onClose={onClose}>
      {days.length === 0 ? (
        <EmptyState
          title="No other days logged yet"
          hint="Once you have logged another day, you can copy it here in one tap."
        />
      ) : (
        <ul className="divide-y divide-border">
          {days.map(([date, dayEntries]) => (
            <li key={date}>
              <button
                onClick={() => {
                  setSource(date);
                  setMeals([...MEAL_SLOTS]);
                }}
                className="w-full px-4 py-3 text-left hover:bg-sunken"
              >
                <p className="text-sm font-medium">{labelForKey(date)}</p>
                <p className="tabular mt-0.5 text-xs text-muted">
                  {dayEntries.length} item{dayEntries.length === 1 ? "" : "s"} ·{" "}
                  {Math.round(totalNutrients(dayEntries).kcal).toLocaleString()}{" "}
                  kcal
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
