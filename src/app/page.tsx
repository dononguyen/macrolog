"use client";

import { useMemo, useState } from "react";
import { AddFoodDialog } from "@/components/AddFoodDialog";
import { CopyDayDialog } from "@/components/CopyDayDialog";
import { DaySummary } from "@/components/DaySummary";
import { ExerciseSection } from "@/components/ExerciseSection";
import { MealSection } from "@/components/MealSection";
import { PageHeader } from "@/components/PageHeader";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { SaveMealDialog } from "@/components/SaveMealDialog";
import { WaterTracker } from "@/components/WaterTracker";
import { fromKey, labelForKey, shiftKey, todayKey } from "@/lib/date";
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
  const isToday = date === todayKey();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 sm:px-6">
      <PageHeader
        title="macrolog"
        subtitle={fromKey(date).toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      <div className="stagger space-y-3.5">
        <nav className="flex items-center justify-between rounded-2xl border border-border bg-surface p-1.5 shadow-[var(--shadow-sm)]">
          <button
            onClick={() => setDate(shiftKey(date, -1))}
            aria-label="Previous day"
            className="pressable rounded-xl p-2.5 text-muted hover:bg-sunken hover:text-fg"
          >
            <Chevron dir="left" />
          </button>

          <button
            onClick={() => setDate(todayKey())}
            disabled={isToday}
            className="pressable rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-100"
          >
            {labelForKey(date)}
            {!isToday && (
              <span className="ml-2 text-xs font-medium text-accent-text">
                Back to today
              </span>
            )}
          </button>

          <button
            onClick={() => setDate(shiftKey(date, 1))}
            aria-label="Next day"
            className="pressable rounded-xl p-2.5 text-muted hover:bg-sunken hover:text-fg"
          >
            <Chevron dir="right" />
          </button>
        </nav>

        <DaySummary
          totals={totals}
          goals={goals}
          exerciseKcal={exerciseKcal}
          settings={settings}
        />

        <div className="flex gap-3">
          <button
            onClick={() => setCopying(true)}
            className="pressable flex-1 rounded-2xl border border-border bg-surface py-2.5 text-sm font-semibold shadow-[var(--shadow-sm)] hover:border-border-strong hover:bg-sunken"
          >
            Copy a day
          </button>
          <button
            onClick={() => setQuickAdd(true)}
            className="pressable flex-1 rounded-2xl border border-border bg-surface py-2.5 text-sm font-semibold shadow-[var(--shadow-sm)] hover:border-border-strong hover:bg-sunken"
          >
            Quick add
          </button>
        </div>

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

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
