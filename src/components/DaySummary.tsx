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
import { useCountUp } from "@/lib/useCountUp";

const SIZE = 168;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
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
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const over = consumed > budget;
  const remaining = Math.round(budget - consumed);
  const shown = Math.round(useCountUp(Math.abs(remaining)));

  return (
    <div className="relative shrink-0">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ring-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-from)" />
            <stop offset="100%" stopColor="var(--accent-to)" />
          </linearGradient>
          <linearGradient id="ring-over" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--carbs)" />
            <stop offset="100%" stopColor="var(--danger)" />
          </linearGradient>
        </defs>

        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={over ? "url(#ring-over)" : "url(#ring-fill)"}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * clamped} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{
            transition: "stroke-dasharray var(--dur-ring) var(--ease-out)",
            filter: over ? undefined : "drop-shadow(var(--ring-glow))",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular tight text-[2.6rem] font-semibold leading-none">
          {shown.toLocaleString()}
        </span>
        <span className="mt-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          {over ? "over" : "left"}
        </span>
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
  const shown = Math.round(useCountUp(consumed));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted">
          <span className={over && limit ? "text-danger-text" : "text-fg"}>
            {shown.toLocaleString()}
          </span>
          <span className="text-faint">
            {" / "}
            {Math.round(goal).toLocaleString()} {unit}
          </span>
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="relative h-full overflow-hidden rounded-full"
          style={{
            width: `${pct}%`,
            background:
              over && limit
                ? "linear-gradient(90deg, var(--carbs), var(--danger))"
                : `linear-gradient(90deg, color-mix(in oklab, ${color} 72%, white), ${color})`,
            transition: "width var(--dur-ring) var(--ease-out)",
          }}
        >
          {/* One sheen pass as the bar settles, so a filled bar reads as an
              event rather than a static block of colour. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-1/3 bg-white/25"
            style={{
              animation: "sheen 1.4s var(--ease-out) 0.25s both",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * One figure in the Goal − Food + Exercise = Left row. The operator lives in
 * the label rather than in a column of its own: four numbers plus three
 * separators will not fit a phone, and the arithmetic still reads.
 */
function Term({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-faint">
        {label}
      </p>
      <p
        className={`tabular truncate text-sm font-semibold ${
          negative ? "text-danger-text" : ""
        }`}
      >
        {value.toLocaleString()}
      </p>
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
  const left = Math.round(budget - totals.kcal);

  const terms = [
    { label: "Goal", value: goals.kcal },
    { label: "− Food", value: Math.round(totals.kcal) },
    ...(settings.exerciseAddsCalories
      ? [{ label: "+ Exercise", value: exerciseKcal }]
      : []),
    { label: "= Left", value: left, negative: left < 0 },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex flex-col items-center gap-7 p-6 sm:flex-row sm:gap-8">
        <CalorieRing consumed={totals.kcal} budget={budget} />

        <div className="w-full flex-1 space-y-4">
          {/* The arithmetic, spelled out, so the number in the ring is never
              something the user has to take on trust. */}
          <div
            className="grid gap-2 rounded-2xl bg-sunken px-4 py-3"
            style={{
              gridTemplateColumns: `repeat(${terms.length}, minmax(0, 1fr))`,
            }}
          >
            {terms.map((term) => (
              <Term
                key={term.label}
                label={term.label}
                value={term.value}
                negative={term.negative}
              />
            ))}
          </div>

          <div className="space-y-3.5">
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
      </div>

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        aria-expanded={showBreakdown}
        className="pressable w-full border-t border-border py-3 text-sm font-semibold text-accent-text hover:bg-sunken"
      >
        {showBreakdown ? "Hide" : "Show"} full nutrition
      </button>

      {showBreakdown && (
        <div className="animate-fade-up space-y-3.5 border-t border-border p-6">
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
