"use client";

import type { ReactNode } from "react";

/**
 * A progress ring with room for a glyph in the middle.
 *
 * The ring fills to the goal and stops. Going over is shown by colour and by
 * the number beside it, never by a second lap, which would misread as being
 * back under target.
 */
export function Ring({
  value,
  goal,
  size,
  stroke,
  color,
  trackColor = "var(--surface-sunken)",
  over = false,
  children,
}: {
  value: number;
  goal: number;
  size: number;
  stroke: number;
  color: string;
  trackColor?: string;
  over?: boolean;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(Math.max(value / goal, 0), 1) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={over ? "var(--danger)" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray var(--dur-ring) var(--ease-out)",
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

const glyph = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function FlameIcon() {
  return (
    <svg {...glyph} width="22" height="22">
      <path d="M12 3c.7 3 2.6 3.9 3.9 5.6A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-3.9-12.4C9.4 6.9 11.3 6 12 3Z" />
    </svg>
  );
}

/** A cut of meat, for protein. */
export function ProteinIcon() {
  return (
    <svg {...glyph}>
      <path d="M16.5 3.5a5 5 0 0 1 0 7c-1.6 1.6-3 1.4-4.6 3S10 17.6 8.4 19.2a4.5 4.5 0 1 1-3.6-3.6c1.6-1.6 1.2-2 2.7-3.5s1.4-3 3-4.6a5 5 0 0 1 6-4Z" />
      <circle cx="6.5" cy="17.5" r="1.4" />
    </svg>
  );
}

/** An ear of wheat, for carbohydrate. */
export function CarbsIcon() {
  return (
    <svg {...glyph}>
      <path d="M12 21V9" />
      <path d="M12 9c0-2.5 1.6-4.5 4-5 0 2.6-1.5 4.6-4 5Z" />
      <path d="M12 9C12 6.5 10.4 4.5 8 4c0 2.6 1.5 4.6 4 5Z" />
      <path d="M12 15c0-2.2 1.5-3.9 3.6-4.4 0 2.3-1.4 4-3.6 4.4Z" />
      <path d="M12 15c0-2.2-1.5-3.9-3.6-4.4 0 2.3 1.4 4 3.6 4.4Z" />
    </svg>
  );
}

/** A droplet, for fat. */
export function FatIcon() {
  return (
    <svg {...glyph}>
      <path d="M12 3.5c3 3.6 5.5 6.4 5.5 9.4a5.5 5.5 0 0 1-11 0c0-3 2.5-5.8 5.5-9.4Z" />
    </svg>
  );
}
