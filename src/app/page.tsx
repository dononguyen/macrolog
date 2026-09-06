"use client";

import { useMemo, useState } from "react";
import { AddButton, type AddAction } from "@/components/AddButton";
import { AddFoodDialog } from "@/components/AddFoodDialog";
import { CopyDayDialog } from "@/components/CopyDayDialog";
import { DaySummary } from "@/components/DaySummary";
import { ExerciseSection } from "@/components/ExerciseSection";
import { FoodLog } from "@/components/FoodLog";
import { PageHeader } from "@/components/PageHeader";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { SaveMealDialog } from "@/components/SaveMealDialog";
import { WaterTracker } from "@/components/WaterTracker";
import { WeekCalendar } from "@/components/WeekCalendar";
import { fromKey, labelForKey, shiftKey, todayKey } from "@/lib/date";
import { mealForHour, totalNutrients } from "@/lib/types";
import { useStore } from "@/lib/useStore";

type Dialog = "food" | "quick" | "copy" | "save";

export default function DiaryPage() {
  const state = useStore();
  const { entries, exercises, goals, settings, water } = state;

  const [date, setDate] = useState(todayKey());
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date),
    [entries, date],
  );
  const dayExercises = useMemo(
    () => exercises.filter((e) => e.date === date),
    [exercises, date],
  );
  const loggedDates = useMemo(
    () => new Set(entries.map((e) => e.date)),
    [entries],
  );

  const totals = useMemo(() => totalNutrients(dayEntries), [dayEntries]);
  const exerciseKcal = dayExercises.reduce((sum, e) => sum + e.kcal, 0);
  const isToday = date === todayKey();

  // Nearest the button first, so the common action is the shortest reach.
  const actions: AddAction[] = [
    {
      label: "Copy a day",
      icon: <CopyIcon />,
      onClick: () => setDialog("copy"),
    },
    { label: "Quick add", icon: <BoltIcon />, onClick: () => setDialog("quick") },
    { label: "Add food", icon: <SearchIcon />, onClick: () => setDialog("food") },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-36 sm:px-6">
      <PageHeader
        title="macrolog"
        subtitle={labelForKey(date)}
        action={
          !isToday && (
            <button
              onClick={() => setDate(todayKey())}
              className="pressable shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-sunken"
            >
              Today
            </button>
          )
        }
      >
        <div className="mt-2.5">
          <WeekCalendar
            selected={date}
            loggedDates={loggedDates}
            onSelect={setDate}
          />
        </div>
      </PageHeader>

      <div className="stagger space-y-3.5">
        <DaySummary
          totals={totals}
          goals={goals}
          exerciseKcal={exerciseKcal}
          settings={settings}
        />

        <FoodLog
          title={eatenTitle(date)}
          entries={dayEntries}
          onAdd={() => setDialog("food")}
          onSaveAsMeal={() => setDialog("save")}
        />

        <ExerciseSection
          date={date}
          exercises={dayExercises}
          addsCalories={settings.exerciseAddsCalories}
        />

        <WaterTracker date={date} ml={water[date] ?? 0} goalMl={goals.water} />
      </div>

      <AddButton actions={actions} open={menuOpen} onOpenChange={setMenuOpen} />

      {dialog === "food" && (
        <AddFoodDialog
          date={date}
          // The clock picks the likely meal; the dialog lets you say otherwise.
          initialMeal={mealForHour(new Date().getHours())}
          state={state}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "save" && (
        <SaveMealDialog
          entries={dayEntries}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "quick" && (
        <QuickAddDialog date={date} onClose={() => setDialog(null)} />
      )}

      {dialog === "copy" && (
        <CopyDayDialog
          targetDate={date}
          entries={entries}
          onClose={() => setDialog(null)}
        />
      )}
    </main>
  );
}

/** "Eaten today", "Eaten yesterday", or "Eaten on 3 March". */
function eatenTitle(date: string): string {
  const today = todayKey();
  if (date === today) return "Eaten today";
  if (date === shiftKey(today, -1)) return "Eaten yesterday";
  return `Eaten on ${fromKey(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  })}`;
}

const menuIcon = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SearchIcon() {
  return (
    <svg {...menuIcon}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...menuIcon}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...menuIcon}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15a2 2 0 0 1-1-1.7V6a2 2 0 0 1 2-2h7.3A2 2 0 0 1 15 5" />
    </svg>
  );
}
