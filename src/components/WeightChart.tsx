"use client";

import { useState } from "react";
import { fromKey } from "@/lib/date";
import { smoothWeights, type WeightPoint } from "@/lib/stats";
import { formatWeight } from "@/lib/nutrition";
import type { Settings } from "@/lib/types";

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 44 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/**
 * Weigh-ins as dots with a seven-day trailing mean through them. Day-to-day
 * body weight swings by more than most people's weekly change, so the raw
 * series alone reads as noise — the line is what the user should follow.
 */
export function WeightChart({
  series,
  goalKg,
  units,
}: {
  series: WeightPoint[];
  goalKg?: number;
  units: Settings["units"];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const smoothed = smoothWeights(series);

  // Include the goal in the extent so its line is never off-canvas.
  const values = [...series.map((p) => p.kg), ...(goalKg ? [goalKg] : [])];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // A flat series would divide by zero; give it a kilogram of breathing room.
  const pad = Math.max((rawMax - rawMin) * 0.15, 0.5);
  const min = rawMin - pad;
  const max = rawMax + pad;

  const x = (i: number) =>
    PAD.left + (series.length === 1 ? PLOT_W / 2 : (i / (series.length - 1)) * PLOT_W);
  const y = (kg: number) =>
    PAD.top + PLOT_H - ((kg - min) / (max - min)) * PLOT_H;

  const linePath = smoothed
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`)
    .join(" ");

  const ticks = [min, (min + max) / 2, max];
  const active = hover !== null ? series[hover] : null;

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full min-w-[320px]"
          role="img"
          aria-label={`Weight over time, ${series.length} readings`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Recessive grid: three horizontal rules, no vertical lines. */}
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--muted)"
                fontSize="11"
              >
                {value.toFixed(1)}
              </text>
            </g>
          ))}

          {goalKg !== undefined && (
            <>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(goalKg)}
                y2={y(goalKg)}
                stroke="var(--accent)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text
                x={W - PAD.right}
                y={y(goalKg) - 6}
                textAnchor="end"
                fill="var(--accent)"
                fontSize="11"
                fontWeight="600"
              >
                Goal
              </text>
            </>
          )}

          {/* Raw readings sit behind the trend they feed. */}
          {series.map((point, i) => (
            <circle
              key={point.date}
              cx={x(i)}
              cy={y(point.kg)}
              r="4"
              fill="var(--protein)"
              opacity={0.35}
            />
          ))}

          <path
            d={linePath}
            fill="none"
            stroke="var(--protein)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active && hover !== null && (
            <>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                stroke="var(--muted)"
                strokeWidth="1"
              />
              {/* A surface ring keeps the marker legible over the line. */}
              <circle
                cx={x(hover)}
                cy={y(active.kg)}
                r="6"
                fill="var(--protein)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </>
          )}

          {/* Hit targets are far wider than the marks they select. */}
          {series.map((point, i) => (
            <rect
              key={`hit-${point.date}`}
              x={x(i) - PLOT_W / Math.max(series.length, 1) / 2}
              y={PAD.top}
              width={PLOT_W / Math.max(series.length, 1)}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              role="button"
              aria-label={`${point.date}: ${formatWeight(point.kg, units)}`}
            />
          ))}
        </svg>
      </div>

      <figcaption className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          Dots are each weigh-in; the line is a 7-day average.
        </span>
        <span className="tabular shrink-0">
          {active
            ? `${fromKey(active.date).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })} · ${formatWeight(active.kg, units)}`
            : `${series.length} reading${series.length === 1 ? "" : "s"}`}
        </span>
      </figcaption>
    </figure>
  );
}
