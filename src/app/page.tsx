"use client";

import { useMemo, useState } from "react";
import { AddFoodDialog } from "@/components/AddFoodDialog";
import { CopyDayDialog } from "@/components/CopyDayDialog";
import { DaySummary } from "@/components/DaySummary";
import { ExerciseSection } from "@/components/ExerciseSection";
import { MealSection } from "@/components/MealSection";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { SaveMealDialog } from "@/components/SaveMealDialog";
import { WaterTracker } from "@/components/WaterTracker";
import { labelForKey, shiftKey, todayKey } from "@/lib/date";
import { MEAL_SLOTS, totalNutrients, type MealSlot } from "@/lib/types";
import { useStore } from "@/lib/useStore";

export default function DiaryPage() {
  const state = useStore();
  const { entries, exercises, goals, settings, water } = state;

  const [date, setDate] = useState(todayKey());
  const [addingTo, setAddingTo] = useState<MealSlot | null>(null);
  const [savingMeal, setSavingMeal] = useState<MealSlot | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const [copying, setCopying] = useState(false);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date),
    [entries, date],
  );
  const dayExercises = useMemo(
    () => exercises.filter((e) => e.date === date),
    [exercises, date],
  );

  const totals = useMemo(() => totalNutrients(dayEntries), [dayEntries]);
  const exerciseKcal = dayExercises.reduce((sum, e) => sum + e.kcal, 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:px-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">macrolog</h1>

      <nav className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-2 py-1.5">
        <button
          onClick={() => setDate(shiftKey(date, -1))}
          aria-label="Previous day"
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-sunken"
        >
          &lsaquo;
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
          &rsaquo;
        </button>
      </nav>

      <DaySummary
        totals={totals}
        goals={goals}
        exerciseKcal={exerciseKcal}
        settings={settings}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setCopying(true)}
          className="flex-1 rounded-xl border border-border bg-surface py-2 text-sm font-medium hover:bg-sunken"
        >
          Copy a day
        </button>
        <button
          onClick={() => setQuickAdd(true)}
          className="flex-1 rounded-xl border border-border bg-surface py-2 text-sm font-medium hover:bg-sunken"
        >
          Quick add calories
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {MEAL_SLOTS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={dayEntries.filter((e) => e.meal === meal)}
            onAdd={() => setAddingTo(meal)}
            onSaveAsMeal={() => setSavingMeal(meal)}
          />
        ))}

        <ExerciseSection
          date={date}
          exercises={dayExercises}
          addsCalories={settings.exerciseAddsCalories}
        />

        <WaterTracker date={date} ml={water[date] ?? 0} goalMl={goals.water} />
      </div>

      {addingTo && (
        <AddFoodDialog
          date={date}
          meal={addingTo}
          state={state}
          onClose={() => setAddingTo(null)}
        />
      )}

      {savingMeal && (
        <SaveMealDialog
          entries={dayEntries.filter((e) => e.meal === savingMeal)}
          meal={savingMeal}
          onClose={() => setSavingMeal(null)}
        />
      )}

      {quickAdd && (
        <QuickAddDialog date={date} onClose={() => setQuickAdd(false)} />
      )}

      {copying && (
        <CopyDayDialog
          targetDate={date}
          entries={entries}
          onClose={() => setCopying(false)}
        />
      )}
    </main>
  );
}
