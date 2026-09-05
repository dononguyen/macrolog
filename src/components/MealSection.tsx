"use client";

import { removeEntry } from "@/lib/store";
import {
  MEAL_LABELS,
  scaleNutrients,
  totalNutrients,
  type Entry,
  type MealSlot,
} from "@/lib/types";

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
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className="font-semibold">{MEAL_LABELS[meal]}</h2>
        <div className="flex items-baseline gap-3">
          {entries.length > 0 && (
            <button
              onClick={onSaveAsMeal}
              className="text-xs font-medium text-accent hover:underline"
            >
              Save as meal
            </button>
          )}
          <span className="tabular text-sm text-muted">
            {Math.round(totals.kcal).toLocaleString()} kcal
          </span>
        </div>
      </header>

      {entries.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {entries.map((entry) => {
            const macros = scaleNutrients(entry.food.per100g, entry.grams);
            return (
              <li
                key={entry.id}
                className="group flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.food.name}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-muted">
                    {entry.grams} g · {Math.round(macros.protein)}p{" "}
                    {Math.round(macros.carbs)}c {Math.round(macros.fat)}f
                  </p>
                </div>
                <span className="tabular shrink-0 text-sm">
                  {Math.round(macros.kcal).toLocaleString()}
                </span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`Remove ${entry.food.name}`}
                  className="shrink-0 rounded-lg px-1.5 py-1 text-muted opacity-0 transition-opacity hover:bg-sunken hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border p-2">
        <button
          onClick={onAdd}
          className="w-full rounded-xl py-2 text-sm font-medium text-accent hover:bg-sunken"
        >
          + Add food
        </button>
      </div>
    </section>
  );
}
