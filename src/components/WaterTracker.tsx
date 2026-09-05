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

  return (
    <Card
      title="Water"
      action={
        <span className="tabular text-sm text-muted">
          {(ml / 1000).toFixed(2).replace(/0$/, "")} / {(goalMl / 1000).toFixed(1)} L
        </span>
      }
    >
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: shown }, (_, i) => {
            const filled = i < glasses;
            return (
              <button
                key={i}
                aria-label={
                  filled
                    ? `Remove glass ${i + 1}`
                    : `Add glass ${i + 1}`
                }
                // Tapping a filled glass sets the level to just below it, so
                // correcting an over-count is one tap rather than several.
                onClick={() =>
                  setWater(date, filled ? i * GLASS_ML : (i + 1) * GLASS_ML)
                }
                className={`h-9 w-7 rounded-b-lg rounded-t-sm border-2 transition-colors ${
                  filled
                    ? "border-protein bg-protein/25"
                    : "border-border hover:border-protein/50"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setWater(date, ml + GLASS_ML)}
            className="rounded-full border border-border px-3 py-1 text-sm hover:bg-sunken"
          >
            + {GLASS_ML} ml
          </button>
          <button
            onClick={() => setWater(date, ml + 500)}
            className="rounded-full border border-border px-3 py-1 text-sm hover:bg-sunken"
          >
            + 500 ml
          </button>
          {ml > 0 && (
            <button
              onClick={() => setWater(date, 0)}
              className="ml-auto rounded-full px-3 py-1 text-sm text-muted hover:bg-sunken"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
