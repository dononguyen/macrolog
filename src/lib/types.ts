export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

/** Grams of each macro, plus energy in kcal. */
export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * A food is always stored with macros normalised to 100 g. Portions are then
 * just a gram multiplier, which keeps every calculation in the app trivial.
 */
export type Food = {
  id: string;
  name: string;
  brand?: string;
  /** USDA FoodData Central id, when the food came from the API. */
  fdcId?: number;
  per100g: Macros;
  /** A sensible default portion, e.g. one labelled serving. */
  servingGrams?: number;
  servingLabel?: string;
};

/**
 * The food is denormalised into the entry on purpose: editing or deleting a
 * food later must never rewrite what you already ate.
 */
export type Entry = {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  meal: MealSlot;
  food: Food;
  grams: number;
  createdAt: number;
};

export type Goals = Macros;

export const DEFAULT_GOALS: Goals = {
  kcal: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

/** Scale a per-100g macro set to an arbitrary portion. */
export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100g.kcal * f,
    protein: per100g.protein * f,
    carbs: per100g.carbs * f,
    fat: per100g.fat * f,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function totalMacros(entries: Entry[]): Macros {
  return entries.reduce(
    (sum, e) => addMacros(sum, scaleMacros(e.food.per100g, e.grams)),
    ZERO_MACROS,
  );
}
