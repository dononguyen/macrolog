import { shiftKey, todayKey } from "./date";
import {
  ZERO_NUTRIENTS,
  addNutrients,
  entryNutrients,
  mapNutrients,
  type Entry,
  type Nutrients,
} from "./types";

/** Derived views over the log. Pure functions of stored data, nothing cached. */

/** Total nutrients for every day that has at least one entry. */
export function dailyTotals(entries: Entry[]): Map<string, Nutrients> {
  const byDate = new Map<string, Nutrients>();
  for (const entry of entries) {
    byDate.set(
      entry.date,
      addNutrients(byDate.get(entry.date) ?? ZERO_NUTRIENTS, entryNutrients(entry)),
    );
  }
  return byDate;
}

/** The n calendar days ending at `end`, oldest first. */
export function dayRange(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftKey(end, -(n - 1 - i)));
}

/**
 * Consecutive logged days ending today. Today not being logged yet does not
 * break a streak — it is only broken once a full day has been missed — so the
 * count starts from yesterday when today is still empty.
 */
export function loggingStreak(entries: Entry[], today = todayKey()): number {
  const logged = new Set(entries.map((e) => e.date));
  let cursor = logged.has(today) ? today : shiftKey(today, -1);
  let streak = 0;
  while (logged.has(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}

/**
 * Mean intake across a window. Days with nothing logged are skipped rather
 * than counted as zero, which would drag an average down for no reason other
 * than a day the user did not open the app.
 */
export function averageOverDays(
  totals: Map<string, Nutrients>,
  days: string[],
): { average: Nutrients; loggedDays: number } {
  const logged = days.filter((d) => totals.has(d));
  if (logged.length === 0) {
    return { average: ZERO_NUTRIENTS, loggedDays: 0 };
  }
  const sum = logged.reduce(
    (acc, day) => addNutrients(acc, totals.get(day)!),
    ZERO_NUTRIENTS,
  );
  return {
    average: mapNutrients(sum, (v) => v / logged.length),
    loggedDays: logged.length,
  };
}

export type WeightPoint = { date: string; kg: number };

/** Weight entries as a sorted series. */
export function weightSeries(weights: Record<string, number>): WeightPoint[] {
  return Object.entries(weights)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * A trailing mean, because day-to-day body weight swings by more than most
 * people's weekly change — the raw line is mostly water, the smoothed one is
 * the signal.
 */
export function smoothWeights(
  series: WeightPoint[],
  window = 7,
): WeightPoint[] {
  return series.map((point, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = series.slice(from, i + 1);
    return {
      date: point.date,
      kg: slice.reduce((sum, p) => sum + p.kg, 0) / slice.length,
    };
  });
}

/** Change between the first and last readings, in kg. */
export function weightChange(series: WeightPoint[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].kg - series[0].kg;
}
