"use client";

import { useState } from "react";
import { calorieBudget } from "@/lib/nutrition";
import {
  MICRO_KEYS,
  NUTRIENT_META,
  type Goals,
  type NutrientKey,
  type Nutrients,
  type Settings,
} from "@/lib/types";
import { useCountUp } from "@/lib/useCountUp";
import {
  CarbsIcon,
  FatIcon,
  FlameIcon,
  ProteinIcon,
  Ring,
} from "./Ring";

const MACRO_CARDS = [
  { key: "protein", label: "Protein left", color: "var(--protein)", Icon: ProteinIcon },
  { key: "carbs", label: "Carbs left", color: "var(--carbs)", Icon: CarbsIcon },
  { key: "fat", label: "Fat left", color: "var(--fat)", Icon: FatIcon },
] as const;

export function DaySummary({
  totals,
  goals,
  exerciseKcal,
  settings,
}: {
  totals: Nutrients;
  goals: Goals;
  exerciseKcal: number;
  settings: Settings;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const budget = calorieBudget(goals, exerciseKcal, settings);
  const left = Math.round(budget - totals.kcal);
  const over = left < 0;
  const shownLeft = Math.round(useCountUp(Math.abs(left)));

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------- calories */}
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p
              className={`tabular tight text-[2.75rem] font-bold leading-none ${
                over ? "text-danger-text" : ""
              }`}
            >
              {shownLeft.toLocaleString()}
            </p>
            <p className="mt-2 text-sm font-medium text-muted">
              {over ? "Calories over" : "Calories left"}
            </p>
            {/* The budget is only worth explaining when exercise moved it. */}
            {settings.exerciseAddsCalories && exerciseKcal > 0 && (
              <p className="tabular mt-1 text-xs text-faint">
                {goals.kcal.toLocaleString()} goal + {exerciseKcal.toLocaleString()}{" "}
                exercise
              </p>
            )}
          </div>

          <Ring
            value={totals.kcal}
            goal={budget}
            size={104}
            stroke={11}
            color="var(--accent)"
            over={over}
          >
            <span className={over ? "text-danger-text" : "text-fg"}>
              <FlameIcon />
            </span>
          </Ring>
        </div>
      </section>

      {/* --------------------------------------------------------- macros */}
      <div className="grid grid-cols-3 gap-3">
        {MACRO_CARDS.map(({ key, label, color, Icon }) => (
          <MacroCard
            key={key}
            label={label}
            consumed={totals[key]}
            goal={goals[key]}
            color={color}
            icon={<Icon />}
          />
        ))}
      </div>

      {/* ----------------------------------------------------- everything */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-sm)]">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          aria-expanded={showBreakdown}
          className="pressable w-full px-5 py-3.5 text-left text-sm font-semibold hover:bg-sunken"
        >
          {showBreakdown ? "Hide" : "Show"} fibre, sugar, sodium
          <span className="float-right font-normal text-faint">
            {showBreakdown ? "−" : "+"}
          </span>
        </button>

        {showBreakdown && (
          <div className="animate-fade-up space-y-3.5 border-t border-border px-5 py-4">
            {(MICRO_KEYS as readonly NutrientKey[]).map((key) => (
              <MicroBar
                key={key}
                label={NUTRIENT_META[key].label}
                consumed={totals[key]}
                goal={goals[key]}
                unit={NUTRIENT_META[key].unit}
                // Fibre is a target to reach; the rest are ceilings.
                limit={key !== "fiber"}
              />
            ))}
            <p className="text-xs text-muted">
              Fibre is a target to reach. The rest are limits to stay under.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function MacroCard({
  label,
  consumed,
  goal,
  color,
  icon,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  icon: React.ReactNode;
}) {
  const left = Math.round(goal - consumed);
  const over = left < 0;
  const shown = Math.round(useCountUp(Math.abs(left)));

  return (
    <section className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface px-2 py-4 shadow-[var(--shadow-sm)]">
      <p
        className={`tabular tight text-xl font-bold leading-none ${
          over ? "text-danger-text" : ""
        }`}
      >
        {shown.toLocaleString()}g
      </p>
      <p className="text-center text-[11px] font-medium leading-tight text-muted">
        {over ? label.replace("left", "over") : label}
      </p>
      <Ring
        value={consumed}
        goal={goal}
        size={52}
        stroke={6}
        color={color}
        over={over}
      >
        <span style={{ color: over ? "var(--danger)" : color }}>{icon}</span>
      </Ring>
    </section>
  );
}

function MicroBar({
  label,
  consumed,
  goal,
  unit,
  limit,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  limit: boolean;
}) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const over = consumed > goal;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted">
          <span className={over && limit ? "text-danger-text" : "text-fg"}>
            {Math.round(consumed).toLocaleString()}
          </span>
          <span className="text-faint">
            {" / "}
            {Math.round(goal).toLocaleString()} {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: over && limit ? "var(--danger)" : "var(--accent)",
            transition: "width var(--dur-ring) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}
