"use client";

import { useMemo, useState } from "react";
import { AddFoodDialog } from "@/components/AddFoodDialog";
import { MacroSummary } from "@/components/MacroSummary";
import { MealSection } from "@/components/MealSection";
import { labelForKey, shiftKey, todayKey } from "@/lib/date";
import { useStore } from "@/lib/useStore";
import { MEAL_SLOTS, totalNutrients, type MealSlot } from "@/lib/types";

export default function Home() {
  const { entries, library, goals } = useStore();
  const [date, setDate] = useState(todayKey());
  const [addingTo, setAddingTo] = useState<MealSlot | null>(null);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date),
    [entries, date],
  );
  const totals = useMemo(() => totalNutrients(dayEntries), [dayEntries]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">macrolog</h1>

      </header>

      <nav className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-2 py-1.5">
        <button
          onClick={() => setDate(shiftKey(date, -1))}
          aria-label="Previous day"
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-sunken"
        >
          ‹
        </button>
        <button
          onClick={() => setDate(todayKey())}
          className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-sunken"
        >
          {labelForKey(date)}
        </button>
        <button
          onClick={() => setDate(shiftKey(date, 1))}
          aria-label="Next day"
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-sunken"
        >
          ›
        </button>
      </nav>

      <MacroSummary totals={totals} goals={goals} />

      <div className="mt-4 space-y-3">
        {MEAL_SLOTS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={dayEntries.filter((e) => e.meal === meal)}
            onAdd={() => setAddingTo(meal)}
          />
        ))}
      </div>

      {addingTo && (
        <AddFoodDialog
          date={date}
          meal={addingTo}
          recents={library}
          onClose={() => setAddingTo(null)}
        />
      )}
    </main>
  );
}
