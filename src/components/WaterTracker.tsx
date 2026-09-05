"use client";

import { setWater } from "@/lib/store";
import { Card } from "./ui";

/** One tap adds a glass; the goal is stored in ml so any glass size works. */
const GLASS_ML = 250;

export function WaterTracker({
  date,
  ml,
  goalMl,
}: {
  date: string;
  ml: number;
  goalMl: number;
}) {
  const glasses = Math.round(ml / GLASS_ML);
  const goalGlasses = Math.max(1, Math.round(goalMl / GLASS_ML));
  // Always draw at least the goal, and grow the row if you drink past it.
  const shown = Math.max(goalGlasses, glasses);
  const pct = goalMl > 0 ? Math.min((ml / goalMl) * 100, 100) : 0;

  return (
    <Card
      title="Water"
      action={
        <span className="tabular text-sm font-medium text-muted">
          {(ml / 1000).toFixed(1)}
          <span className="text-faint"> / {(goalMl / 1000).toFixed(1)} L</span>
        </span>
      }
    >
      <div className="px-5 pb-5">
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--protein) 65%, white), var(--protein))",
              transition: "width var(--dur-ring) var(--ease-out)",
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: shown }, (_, i) => {
            const filled = i < glasses;
            return (
              <button
                key={i}
                aria-label={filled ? `Remove glass ${i + 1}` : `Add glass ${i + 1}`}
                // Tapping a filled glass sets the level to just below it, so
                // correcting an over-count is one tap rather than several.
                onClick={() =>
                  setWater(date, filled ? i * GLASS_ML : (i + 1) * GLASS_ML)
                }
                className="pressable relative h-10 w-7 overflow-hidden rounded-b-xl rounded-t-sm border-2"
                style={{
                  borderColor: filled ? "var(--protein)" : "var(--border-strong)",
                }}
              >
                {/* The fill rises rather than appearing, so a tap looks like pouring. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 bg-protein/30"
                  style={{
                    height: filled ? "100%" : "0%",
                    transition: "height var(--dur-base) var(--ease-out)",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setWater(date, ml + GLASS_ML)}
            className="pressable rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:border-border-strong hover:bg-sunken"
          >
            + {GLASS_ML} ml
          </button>
          <button
            onClick={() => setWater(date, ml + 500)}
            className="pressable rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:border-border-strong hover:bg-sunken"
          >
            + 500 ml
          </button>
          {ml > 0 && (
            <button
              onClick={() => setWater(date, 0)}
              className="pressable ml-auto rounded-full px-3 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
