"use client";

import { useState } from "react";
import { calorieBudget } from "@/lib/nutrition";
import {
  MACRO_KEYS,
  MICRO_KEYS,
  NUTRIENT_META,
  type Goals,
  type NutrientKey,
  type Nutrients,
  type Settings,
} from "@/lib/types";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MACRO_COLORS: Record<string, string> = {
  protein: "var(--protein)",
  carbs: "var(--carbs)",
  fat: "var(--fat)",
};

function CalorieRing({ consumed, budget }: { consumed: number; budget: number }) {
  const ratio = budget > 0 ? consumed / budget : 0;
  // The ring fills to the budget and stops. Going over is shown by colour and
  // by the number inside, not by a second lap, which would misread as being
  // back under target.
  const dash = CIRCUMFERENCE * Math.min(Math.max(ratio, 0), 1);
  const over = consumed > budget;
  const remaining = Math.round(budget - consumed);

  return (
    <div className="relative shrink-0">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke={over ? "var(--danger)" : "var(--accent)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          transform="rotate(-90 70 70)"
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-3xl font-semibold leading-none">
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="mt-1 text-xs text-muted">{over ? "over" : "left"}</span>
      </div>
    </div>
  );
}

function Bar({
  label,
  consumed,
  goal,
  unit,
  color,
  /** Nutrients you are meant to stay under rather than reach. */
  limit = false,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  color: string;
  limit?: boolean;
}) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const over = consumed > goal;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted">
          <span className={over ? "text-danger" : "text-fg"}>
            {Math.round(consumed).toLocaleString()}
          </span>
          {" / "}
          {Math.round(goal).toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: over && limit ? "var(--danger)" : color,
          }}
        />
      </div>
    </div>
  );
}

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

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <CalorieRing consumed={totals.kcal} budget={budget} />

        <div className="w-full flex-1 space-y-3.5">
          {/* MyFitnessPal's equation, spelled out so the budget is never a
              number the user has to take on trust. */}
          <div className="flex items-center justify-between gap-1 border-b border-border pb-3 text-center">
            {[
              ["Goal", goals.kcal],
              ["Food", -Math.round(totals.kcal)],
              ...(settings.exerciseAddsCalories
                ? ([["Exercise", exerciseKcal]] as [string, number][])
                : []),
              ["Left", Math.round(budget - totals.kcal)],
            ].map(([label, value], i, arr) => (
              <div key={label as string} className="flex items-center gap-1">
                <div>
                  <p className="text-xs text-muted">{label}</p>
                  <p
                    className={`tabular text-sm font-semibold ${
                      i === arr.length - 1 && (value as number) < 0
                        ? "text-danger"
                        : ""
                    }`}
                  >
                    {(value as number) < 0 && i !== arr.length - 1 ? "−" : ""}
                    {Math.abs(value as number).toLocaleString()}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <span aria-hidden="true" className="pt-4 text-xs text-muted">
                    {i === arr.length - 2 ? "=" : (value as number) < 0 ? "" : "+"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {MACRO_KEYS.map((key) => (
            <Bar
              key={key}
              label={NUTRIENT_META[key].label}
              consumed={totals[key]}
              goal={goals[key]}
              unit={NUTRIENT_META[key].unit}
              color={MACRO_COLORS[key]}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        aria-expanded={showBreakdown}
        className="mt-4 w-full rounded-xl py-2 text-sm font-medium text-accent hover:bg-sunken"
      >
        {showBreakdown ? "Hide" : "Show"} full nutrition
      </button>

      {showBreakdown && (
        <div className="mt-3 space-y-3.5 border-t border-border pt-4">
          {(MICRO_KEYS as readonly NutrientKey[]).map((key) => (
            <Bar
              key={key}
              label={NUTRIENT_META[key].label}
              consumed={totals[key]}
              goal={goals[key]}
              unit={NUTRIENT_META[key].unit}
              color="var(--muted)"
              // Fibre is a target to reach; the rest are ceilings.
              limit={key !== "fiber"}
            />
          ))}
          <p className="text-xs text-muted">
            Fibre is a target to reach. Sugar, saturated fat, sodium and
            cholesterol are limits to stay under.
          </p>
        </div>
      )}
    </section>
  );
}
