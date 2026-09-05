import assert from "node:assert/strict";
import { test } from "node:test";
import {
  averageOverDays,
  dailyTotals,
  dayRange,
  loggingStreak,
  smoothWeights,
  weightChange,
  weightSeries,
} from "./stats";
import { ZERO_NUTRIENTS, type Entry } from "./types";

const entry = (date: string, kcal: number): Entry => ({
  id: `${date}-${kcal}`,
  date,
  meal: "breakfast",
  food: { id: "f", name: "f", per100g: { ...ZERO_NUTRIENTS, kcal } },
  grams: 100,
  createdAt: 0,
});

test("dayRange ends on the given day and runs oldest first", () => {
  const days = dayRange("2026-03-05", 3);
  assert.deepEqual(days, ["2026-03-03", "2026-03-04", "2026-03-05"]);
});

test("dayRange crosses a month boundary", () => {
  assert.deepEqual(dayRange("2026-03-02", 3), [
    "2026-02-28",
    "2026-03-01",
    "2026-03-02",
  ]);
});

test("dayRange crosses a leap day", () => {
  assert.deepEqual(dayRange("2028-03-01", 3), [
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
  ]);
});

test("daily totals group by calendar day", () => {
  const totals = dailyTotals([
    entry("2026-03-01", 100),
    entry("2026-03-01", 250),
    entry("2026-03-02", 400),
  ]);
  assert.equal(totals.get("2026-03-01")!.kcal, 350);
  assert.equal(totals.get("2026-03-02")!.kcal, 400);
  assert.equal(totals.has("2026-03-03"), false);
});

test("today not yet logged does not break yesterday's streak", () => {
  const entries = [
    entry("2026-03-03", 100),
    entry("2026-03-04", 100),
    entry("2026-03-05", 100),
  ];
  // Today is the 6th and still empty: the run through the 5th stands.
  assert.equal(loggingStreak(entries, "2026-03-06"), 3);
  // Logging today extends it.
  assert.equal(
    loggingStreak([...entries, entry("2026-03-06", 100)], "2026-03-06"),
    4,
  );
});

test("a full missed day ends the streak", () => {
  const entries = [entry("2026-03-01", 100), entry("2026-03-02", 100)];
  assert.equal(loggingStreak(entries, "2026-03-05"), 0);
});

test("no entries at all is a zero streak", () => {
  assert.equal(loggingStreak([], "2026-03-05"), 0);
});

test("averages skip unlogged days instead of counting them as zero", () => {
  const totals = dailyTotals([entry("2026-03-01", 2000), entry("2026-03-03", 1000)]);
  const days = dayRange("2026-03-03", 3); // 01, 02 (empty), 03
  const { average, loggedDays } = averageOverDays(totals, days);

  assert.equal(loggedDays, 2);
  // Mean of the two logged days, not a third of the sum.
  assert.equal(average.kcal, 1500);
});

test("averaging a window with nothing logged yields zeroes, not NaN", () => {
  const { average, loggedDays } = averageOverDays(new Map(), dayRange("2026-03-03", 7));
  assert.equal(loggedDays, 0);
  assert.deepEqual(average, ZERO_NUTRIENTS);
});

test("weight series is sorted by date regardless of insertion order", () => {
  const series = weightSeries({
    "2026-03-03": 80,
    "2026-03-01": 82,
    "2026-03-02": 81,
  });
  assert.deepEqual(
    series.map((p) => p.date),
    ["2026-03-01", "2026-03-02", "2026-03-03"],
  );
});

test("smoothing damps a single-day spike", () => {
  const series = [
    { date: "d1", kg: 80 },
    { date: "d2", kg: 80 },
    { date: "d3", kg: 90 },
  ];
  const smoothed = smoothWeights(series, 3);
  // The raw spike is 90; the trailing mean pulls it back towards the run.
  assert.equal(smoothed[2].kg, (80 + 80 + 90) / 3);
  // The first point has nothing behind it and stays put.
  assert.equal(smoothed[0].kg, 80);
});

test("weight change needs two readings", () => {
  assert.equal(weightChange([{ date: "d1", kg: 80 }]), null);
  assert.equal(
    weightChange([
      { date: "d1", kg: 82 },
      { date: "d2", kg: 80 },
    ]),
    -2,
  );
});
