"use client";

import { removeEntry } from "@/lib/store";
import {
  MEAL_LABELS,
  entryNutrients,
  totalNutrients,
  type Entry,
  type MealSlot,
} from "@/lib/types";

/** A quiet colour per meal, so the four sections differ at a glance. */
const MEAL_TINT: Record<MealSlot, string> = {
  breakfast: "var(--carbs)",
  lunch: "var(--protein)",
  dinner: "var(--fat)",
  snack: "var(--accent)",
};

export function MealSection({
  meal,
  entries,
  onAdd,
  onSaveAsMeal,
}: {
  meal: MealSlot;
  entries: Entry[];
  onAdd: () => void;
  onSaveAsMeal: () => void;
}) {
  const totals = totalNutrients(entries);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-sm)]">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ background: MEAL_TINT[meal] }}
          />
          <h2 className="tight font-semibold">{MEAL_LABELS[meal]}</h2>
        </div>

        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <button
              onClick={onSaveAsMeal}
              className="pressable rounded-lg px-2 py-1 text-xs font-semibold text-accent-text hover:bg-sunken"
            >
              Save as meal
            </button>
          )}
          <span className="tabular text-sm font-medium text-muted">
            {Math.round(totals.kcal).toLocaleString()}
            <span className="text-faint"> kcal</span>
          </span>
        </div>
      </header>

      {entries.length > 0 && (
        <ul className="border-t border-border">
          {entries.map((entry) => {
            const macros = entryNutrients(entry);
            return (
              <li
                key={entry.id}
                className="group flex items-center gap-3 border-b border-border/60 px-5 py-3 transition-colors last:border-b-0 hover:bg-sunken"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.food.name}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-muted">
                    {entry.grams} g<span className="text-faint"> · </span>
                    <span style={{ color: "var(--protein)" }}>
                      {Math.round(macros.protein)}P
                    </span>{" "}
                    <span style={{ color: "var(--carbs)" }}>
                      {Math.round(macros.carbs)}C
                    </span>{" "}
                    <span style={{ color: "var(--fat)" }}>
                      {Math.round(macros.fat)}F
                    </span>
                  </p>
                </div>

                <span className="tabular shrink-0 text-sm font-semibold">
                  {Math.round(macros.kcal).toLocaleString()}
                </span>

                <button
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`Remove ${entry.food.name}`}
                  className="pressable shrink-0 rounded-lg p-1.5 text-faint opacity-0 hover:bg-danger-soft hover:text-danger-text focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border p-2">
        <button
          onClick={onAdd}
          className="pressable w-full rounded-2xl py-2.5 text-sm font-semibold text-accent-text hover:bg-sunken"
        >
          + Add food
        </button>
      </div>
    </section>
  );
}
