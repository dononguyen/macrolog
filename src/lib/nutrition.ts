import {
  DEFAULT_GOALS,
  type ActivityLevel,
  type Goals,
  type Profile,
  type Settings,
} from "./types";

/**
 * Turning body stats into daily targets. The formulas here are the standard
 * ones; the point of collecting them in a single module is that the numbers
 * shown to the user can always be traced back to a named method.
 */

export const ACTIVITY_LEVELS: Record<
  ActivityLevel,
  { label: string; hint: string; multiplier: number }
> = {
  sedentary: {
    label: "Sedentary",
    hint: "Desk job, little deliberate exercise",
    multiplier: 1.2,
  },
  light: {
    label: "Lightly active",
    hint: "Light exercise 1–3 days a week",
    multiplier: 1.375,
  },
  moderate: {
    label: "Moderately active",
    hint: "Moderate exercise 3–5 days a week",
    multiplier: 1.55,
  },
  active: {
    label: "Active",
    hint: "Hard exercise 6–7 days a week",
    multiplier: 1.725,
  },
  veryActive: {
    label: "Very active",
    hint: "Physical job, or twice-daily training",
    multiplier: 1.9,
  },
};

/**
 * Mifflin-St Jeor, the equation most widely used clinically and the one MFP
 * builds on. Predicts resting expenditure to roughly ±10% for most people.
 */
export function bmr(profile: Profile): number {
  const { weightKg, heightCm, age, sex } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Resting expenditure scaled by how much you move. */
export function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_LEVELS[profile.activity].multiplier;
}

/** A kilogram of body mass is worth roughly 7700 kcal. */
const KCAL_PER_KG = 7700;

/**
 * Maintenance shifted by the weekly rate of change. Floored at a level that
 * stays within common guidance for a minimum intake, so an aggressive rate
 * cannot silently produce a dangerous target.
 */
export function goalCalories(profile: Profile): number {
  const dailyShift = (profile.rateKgPerWeek * KCAL_PER_KG) / 7;
  const floor = profile.sex === "male" ? 1500 : 1200;
  return Math.max(floor, Math.round(tdee(profile) + dailyShift));
}

/** True when the requested rate had to be clamped to the intake floor. */
export function isRateClamped(profile: Profile): boolean {
  const dailyShift = (profile.rateKgPerWeek * KCAL_PER_KG) / 7;
  const floor = profile.sex === "male" ? 1500 : 1200;
  return Math.round(tdee(profile) + dailyShift) < floor;
}

export type MacroSplit = {
  label: string;
  hint: string;
  /** Share of total calories, summing to 1. */
  protein: number;
  carbs: number;
  fat: number;
};

export const MACRO_SPLITS: Record<string, MacroSplit> = {
  balanced: {
    label: "Balanced",
    hint: "20% protein · 50% carbs · 30% fat",
    protein: 0.2,
    carbs: 0.5,
    fat: 0.3,
  },
  highProtein: {
    label: "High protein",
    hint: "35% protein · 35% carbs · 30% fat",
    protein: 0.35,
    carbs: 0.35,
    fat: 0.3,
  },
  lowCarb: {
    label: "Low carb",
    hint: "30% protein · 20% carbs · 50% fat",
    protein: 0.3,
    carbs: 0.2,
    fat: 0.5,
  },
};

export type MacroSplitKey = keyof typeof MACRO_SPLITS;

/** Atwater factors: the kcal each gram of a macro provides. */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Builds a full set of daily targets from a profile.
 *
 * Macros come from the chosen split. The remaining targets follow public
 * dietary guidance rather than anything personalised: fibre at 14 g per
 * 1000 kcal, sugar and saturated fat capped at 10% of calories each, and
 * fixed limits for sodium and cholesterol. Water is scaled by body weight.
 */
export function goalsFromProfile(
  profile: Profile,
  splitKey: MacroSplitKey,
): Goals {
  const kcal = goalCalories(profile);
  const split = MACRO_SPLITS[splitKey] ?? MACRO_SPLITS.balanced;

  return {
    kcal,
    protein: Math.round((kcal * split.protein) / KCAL_PER_GRAM.protein),
    carbs: Math.round((kcal * split.carbs) / KCAL_PER_GRAM.carbs),
    fat: Math.round((kcal * split.fat) / KCAL_PER_GRAM.fat),
    fiber: Math.round((kcal / 1000) * 14),
    sugar: Math.round((kcal * 0.1) / 4),
    satFat: Math.round((kcal * 0.1) / 9),
    sodium: DEFAULT_GOALS.sodium,
    cholesterol: DEFAULT_GOALS.cholesterol,
    water: Math.round((profile.weightKg * 35) / 50) * 50,
  };
}

/** The percentage split a set of goals actually represents. */
export function splitOfGoals(goals: Goals): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const kcal =
    goals.protein * KCAL_PER_GRAM.protein +
    goals.carbs * KCAL_PER_GRAM.carbs +
    goals.fat * KCAL_PER_GRAM.fat;
  if (kcal <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: (goals.protein * KCAL_PER_GRAM.protein) / kcal,
    carbs: (goals.carbs * KCAL_PER_GRAM.carbs) / kcal,
    fat: (goals.fat * KCAL_PER_GRAM.fat) / kcal,
  };
}

/**
 * The named split a set of goals is closest to, by total difference across the
 * three shares. Settings uses it to re-open on the split you are actually
 * running: defaulting the picker back to "balanced" would misreport your
 * targets, and re-saving would then quietly rewrite them.
 */
export function nearestSplit(goals: Goals): MacroSplitKey {
  const actual = splitOfGoals(goals);
  let best: MacroSplitKey = "balanced";
  let bestDistance = Infinity;

  for (const [key, split] of Object.entries(MACRO_SPLITS)) {
    const distance =
      Math.abs(actual.protein - split.protein) +
      Math.abs(actual.carbs - split.carbs) +
      Math.abs(actual.fat - split.fat);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = key;
    }
  }

  return best;
}

/**
 * The day's calorie allowance. With the MyFitnessPal model switched on,
 * exercise raises it; with it off, exercise is recorded but the target holds.
 */
export function calorieBudget(
  goals: Goals,
  exerciseKcal: number,
  settings: Settings,
): number {
  return settings.exerciseAddsCalories ? goals.kcal + exerciseKcal : goals.kcal;
}

// ------------------------------------------------------------------- units

export const LB_PER_KG = 2.2046226218;
export const CM_PER_INCH = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: Math.round(totalInches - feet * 12) };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

/** Formats a weight in the user's chosen units, with the unit attached. */
export function formatWeight(kg: number, units: Settings["units"]): string {
  return units === "imperial"
    ? `${kgToLb(kg).toFixed(1)} lb`
    : `${kg.toFixed(1)} kg`;
}
