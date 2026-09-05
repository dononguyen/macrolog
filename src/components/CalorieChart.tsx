"use client";

import { useState } from "react";
import { fromKey } from "@/lib/date";
import type { Nutrients } from "@/lib/types";

const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 30, left: 44 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const BAR_GAP = 4;
/** Rounded data-ends, anchored square to the baseline. */
const BAR_RADIUS = 4;

/**
 * Calories per day against the goal. The bar splits at the goal line, so being
 * over is encoded by position first and colour second — the excess sits
 * visibly above a labelled rule whether or not the colour reads.
 */
export function CalorieChart({
  days,
  totals,
  goalKcal,
}: {
  days: string[];
  totals: Map<string, Nutrients>;
  goalKcal: number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const values = days.map((day) => totals.get(day)?.kcal ?? 0);
  const max = Math.max(goalKcal * 1.15, ...values, 1);

  const bandWidth = PLOT_W / days.length;
  const barWidth = Math.max(bandWidth - BAR_GAP, 2);

  const y = (kcal: number) => PAD.top + PLOT_H - (kcal / max) * PLOT_H;
  const goalY = y(goalKcal);

  const active = hover ? totals.get(hover) : null;

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-52 w-full min-w-[320px]"
          role="img"
          aria-label={`Calories logged over the last ${days.length} days`}
          onMouseLeave={() => setHover(null)}
        >
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            stroke="var(--border)"
            strokeWidth="1"
          />

          {days.map((day, i) => {
            const kcal = totals.get(day)?.kcal ?? 0;
            const logged = totals.has(day);
            const x = PAD.left + i * bandWidth + BAR_GAP / 2;
            const isHover = hover === day;

            if (!logged) {
              // An unlogged day is a gap, not a zero — say so with a stub.
              return (
                <rect
                  key={day}
                  x={x}
                  y={PAD.top + PLOT_H - 3}
                  width={barWidth}
                  height={3}
                  rx={1.5}
                  fill="var(--border)"
                />
              );
            }

            const under = Math.min(kcal, goalKcal);
            const over = Math.max(kcal - goalKcal, 0);

            return (
              <g key={day} opacity={hover && !isHover ? 0.55 : 1}>
                <rect
                  x={x}
                  y={y(under)}
                  width={barWidth}
                  height={PAD.top + PLOT_H - y(under)}
                  rx={BAR_RADIUS}
                  fill="var(--protein)"
                />
                {over > 0 && (
                  // A 2px surface gap keeps the two segments from reading as
                  // one block.
                  <rect
                    x={x}
                    y={y(kcal)}
                    width={barWidth}
                    height={Math.max(goalY - y(kcal) - 2, 1)}
                    rx={BAR_RADIUS}
                    fill="var(--danger)"
                  />
                )}
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={goalY}
            y2={goalY}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text
            x={PAD.left - 8}
            y={goalY}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--accent)"
            fontSize="11"
            fontWeight="600"
          >
            {goalKcal.toLocaleString()}
          </text>

          {/* Only the ends of the range are labelled, never every bar. */}
          {[0, days.length - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + i * bandWidth + bandWidth / 2}
              y={H - 10}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="11"
            >
              {fromKey(days[i]).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </text>
          ))}

          {days.map((day, i) => (
            <rect
              key={`hit-${day}`}
              x={PAD.left + i * bandWidth}
              y={PAD.top}
              width={bandWidth}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHover(day)}
              onFocus={() => setHover(day)}
              tabIndex={0}
              role="button"
              aria-label={`${day}: ${Math.round(
                totals.get(day)?.kcal ?? 0,
              ).toLocaleString()} kcal`}
            />
          ))}
        </svg>
      </div>

      <figcaption className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>Dashed line is your calorie goal.</span>
        <span className="tabular shrink-0">
          {hover && active
            ? `${fromKey(hover).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })} · ${Math.round(active.kcal).toLocaleString()} kcal`
            : hover
              ? "Nothing logged"
              : ""}
        </span>
      </figcaption>
    </figure>
  );
}
