import assert from "node:assert/strict";
import { test } from "node:test";
import {
  KCAL_PER_GRAM,
  bmr,
  calorieBudget,
  feetInchesToCm,
  goalCalories,
  goalsFromProfile,
  isRateClamped,
  kgToLb,
  lbToKg,
  nearestSplit,
  splitOfGoals,
  tdee,
} from "./nutrition";
import { DEFAULT_GOALS, DEFAULT_SETTINGS, type Profile } from "./types";

const subject: Profile = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  rateKgPerWeek: 0,
};

test("Mifflin-St Jeor matches the published equation", () => {
  // 10(80) + 6.25(180) - 5(30) + 5 = 1780
  assert.equal(bmr(subject), 1780);
  // The female variant differs by a fixed 166 kcal.
  assert.equal(bmr({ ...subject, sex: "female" }), 1780 - 166);
});

test("activity multiplier scales resting burn", () => {
  assert.equal(Math.round(tdee(subject)), Math.round(1780 * 1.55));
  assert.ok(tdee({ ...subject, activity: "sedentary" }) < tdee(subject));
  assert.ok(tdee({ ...subject, activity: "veryActive" }) > tdee(subject));
});

test("a deficit shifts the target by the weekly rate", () => {
  const maintain = goalCalories(subject);
  const losing = goalCalories({ ...subject, rateKgPerWeek: -0.5 });
  // 0.5 kg/week at 7700 kcal/kg is 550 kcal/day.
  assert.equal(maintain - losing, 550);
});

test("an unsafe rate is clamped to the intake floor and reported", () => {
  const tiny: Profile = {
    sex: "female",
    age: 60,
    heightCm: 150,
    weightKg: 45,
    activity: "sedentary",
    rateKgPerWeek: -1,
  };
  assert.equal(goalCalories(tiny), 1200);
  assert.equal(isRateClamped(tiny), true);
  assert.equal(isRateClamped(subject), false);
});

test("generated macro goals spend the calorie target", () => {
  const goals = goalsFromProfile(subject, "balanced");
  const fromMacros =
    goals.protein * KCAL_PER_GRAM.protein +
    goals.carbs * KCAL_PER_GRAM.carbs +
    goals.fat * KCAL_PER_GRAM.fat;
  // Rounding each macro to whole grams costs a few kcal, no more.
  assert.ok(Math.abs(fromMacros - goals.kcal) <= 10, `drift ${fromMacros - goals.kcal}`);
});

test("splits differ in the direction their names promise", () => {
  const balanced = goalsFromProfile(subject, "balanced");
  const high = goalsFromProfile(subject, "highProtein");
  const low = goalsFromProfile(subject, "lowCarb");

  assert.ok(high.protein > balanced.protein);
  assert.ok(low.carbs < balanced.carbs);
  assert.ok(low.fat > balanced.fat);
});

test("splitOfGoals inverts the split it was generated from", () => {
  const goals = goalsFromProfile(subject, "highProtein");
  const split = splitOfGoals(goals);
  assert.ok(Math.abs(split.protein - 0.35) < 0.01);
  assert.ok(Math.abs(split.carbs - 0.35) < 0.01);
  assert.ok(Math.abs(split.fat - 0.3) < 0.01);
});

test("splitOfGoals survives goals with no macros set", () => {
  const split = splitOfGoals({ ...DEFAULT_GOALS, protein: 0, carbs: 0, fat: 0 });
  assert.deepEqual(split, { protein: 0, carbs: 0, fat: 0 });
});

test("exercise raises the budget only when the setting is on", () => {
  const goals = { ...DEFAULT_GOALS, kcal: 2000 };
  assert.equal(calorieBudget(goals, 300, DEFAULT_SETTINGS), 2300);
  assert.equal(
    calorieBudget(goals, 300, { ...DEFAULT_SETTINGS, exerciseAddsCalories: false }),
    2000,
  );
});

test("unit conversions round-trip", () => {
  assert.ok(Math.abs(lbToKg(kgToLb(72.5)) - 72.5) < 1e-9);
  assert.equal(Math.round(feetInchesToCm(5, 11)), 180);
});

// Settings re-opens on the split your goals represent. Resetting the picker
// to "balanced" made the screen misreport saved targets, and the next save
// silently rewrote them to a split that was never chosen.
test("goals built from a split are recognised as that split", () => {
  const profile: Profile = {
    sex: "male",
    age: 34,
    heightCm: 180,
    weightKg: 80,
    activity: "moderate",
    rateKgPerWeek: -0.5,
  };

  for (const key of ["balanced", "highProtein", "lowCarb"]) {
    assert.equal(nearestSplit(goalsFromProfile(profile, key)), key);
  }
});

test("hand-edited goals report the closest named split", () => {
  // 40% protein / 30% carbs / 30% fat is nearest high protein, not balanced.
  const goals = { ...DEFAULT_GOALS, kcal: 2000, protein: 200, carbs: 150, fat: 67 };
  assert.equal(nearestSplit(goals), "highProtein");
});

test("empty goals fall back to balanced rather than throwing", () => {
  const goals = { ...DEFAULT_GOALS, protein: 0, carbs: 0, fat: 0 };
  assert.equal(nearestSplit(goals), "balanced");
});
