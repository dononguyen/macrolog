export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  // Singular: the meal labels one entry now, rather than heading a section.
  snack: "Snack",
};

/**
 * The meal a food is most likely being logged against, from the clock. Used
 * only as the default selection when adding, so the usual case costs no taps
 * and an unusual one costs exactly one.
 */
export function mealForHour(hour: number): MealSlot {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

/**
 * Everything the app tracks about a food, in one flat shape. Keeping all
 * fields required and numeric means arithmetic over nutrients is a single
 * generic map — no optional handling at any call site.
 *
 * Units: kcal for energy, grams for macros and fibre/sugar/saturated fat,
 * milligrams for sodium and cholesterol.
 */
export type Nutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  satFat: number;
  sodium: number;
  cholesterol: number;
};

export const NUTRIENT_KEYS = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "satFat",
  "sodium",
  "cholesterol",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export const NUTRIENT_META: Record<
  NutrientKey,
  { label: string; unit: string; short: string }
> = {
  kcal: { label: "Calories", unit: "kcal", short: "kcal" },
  protein: { label: "Protein", unit: "g", short: "P" },
  carbs: { label: "Carbs", unit: "g", short: "C" },
  fat: { label: "Fat", unit: "g", short: "F" },
  fiber: { label: "Fibre", unit: "g", short: "Fib" },
  sugar: { label: "Sugar", unit: "g", short: "Sug" },
  satFat: { label: "Saturated fat", unit: "g", short: "SatF" },
  sodium: { label: "Sodium", unit: "mg", short: "Na" },
  cholesterol: { label: "Cholesterol", unit: "mg", short: "Chol" },
};

/** The four the diary leads with; the rest sit behind a breakdown. */
export const MACRO_KEYS = ["protein", "carbs", "fat"] as const;
export const MICRO_KEYS = [
  "fiber",
  "sugar",
  "satFat",
  "sodium",
  "cholesterol",
] as const;

export const ZERO_NUTRIENTS: Nutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  satFat: 0,
  sodium: 0,
  cholesterol: 0,
};

export function mapNutrients(
  n: Nutrients,
  fn: (value: number, key: NutrientKey) => number,
): Nutrients {
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) out[key] = fn(n[key], key);
  return out;
}

/** Fill in any missing keys, for data written by an older version. */
export function normaliseNutrients(n: Partial<Nutrients> | undefined): Nutrients {
  return mapNutrients(ZERO_NUTRIENTS, (_, key) =>
    Number.isFinite(n?.[key]) ? (n![key] as number) : 0,
  );
}

export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  return mapNutrients(per100g, (v) => v * factor);
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return mapNutrients(a, (v, key) => v + b[key]);
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(addNutrients, ZERO_NUTRIENTS);
}

/**
 * A food is always stored with nutrients normalised to 100 g, so a portion is
 * just a gram multiplier and every total is one scale-and-sum.
 */
export type Food = {
  id: string;
  name: string;
  brand?: string;
  /** USDA FoodData Central id, when the food came from the API. */
  fdcId?: number;
  per100g: Nutrients;
  /** A sensible default portion, e.g. one labelled serving. */
  servingGrams?: number;
  servingLabel?: string;
  /** Set when the food is one serving of a saved recipe. */
  recipeId?: string;
};

/**
 * The food is denormalised into the entry on purpose: editing or deleting a
 * food, recipe or saved meal later must never rewrite what you already ate.
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

export function entryNutrients(entry: Entry): Nutrients {
  return scaleNutrients(entry.food.per100g, entry.grams);
}

export function totalNutrients(entries: Entry[]): Nutrients {
  return sumNutrients(entries.map(entryNutrients));
}

// ------------------------------------------------------------- collections

/** A component of a recipe or saved meal: a food at a fixed weight. */
export type Component = {
  food: Food;
  grams: number;
};

/**
 * A recipe is cooked once and eaten in servings, so its nutrients are divided
 * by the serving count. A saved meal is logged as-is, so it is not.
 */
export type Recipe = {
  id: string;
  name: string;
  servings: number;
  components: Component[];
  createdAt: number;
};

export type SavedMeal = {
  id: string;
  name: string;
  components: Component[];
  createdAt: number;
};

export function componentsNutrients(components: Component[]): Nutrients {
  return sumNutrients(
    components.map((c) => scaleNutrients(c.food.per100g, c.grams)),
  );
}

export function componentsGrams(components: Component[]): number {
  return components.reduce((sum, c) => sum + c.grams, 0);
}

/**
 * Turns a recipe into a food representing one serving. The serving weight is
 * the total cooked weight split evenly, which lets a serving be logged like
 * any other food and re-weighed if you eat more or less of it.
 */
export function recipeToFood(recipe: Recipe): Food {
  const servings = Math.max(1, recipe.servings);
  const totalGrams = componentsGrams(recipe.components);
  const servingGrams = totalGrams / servings;
  const total = componentsNutrients(recipe.components);

  // Nutrients are per 100 g of the finished dish, which is independent of how
  // it is portioned, so the serving count only affects the serving weight.
  const per100g =
    totalGrams > 0
      ? mapNutrients(total, (v) => (v / totalGrams) * 100)
      : ZERO_NUTRIENTS;

  return {
    id: `recipe-${recipe.id}`,
    recipeId: recipe.id,
    name: recipe.name,
    per100g,
    servingGrams: servingGrams > 0 ? Math.round(servingGrams) : undefined,
    servingLabel: `1 of ${servings} serving${servings === 1 ? "" : "s"}`,
  };
}

// ----------------------------------------------------------------- tracking

export type Exercise = {
  id: string;
  date: string;
  name: string;
  minutes: number;
  kcal: number;
  createdAt: number;
};

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  /** Negative to lose weight, positive to gain, in kg per week. */
  rateKgPerWeek: number;
  goalWeightKg?: number;
};

export type Goals = Nutrients & {
  /** Millilitres of water per day. */
  water: number;
};

export const DEFAULT_GOALS: Goals = {
  kcal: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fiber: 30,
  sugar: 50,
  satFat: 20,
  sodium: 2300,
  cholesterol: 300,
  water: 2000,
};

export type Theme = "system" | "light" | "dark";

export type Settings = {
  /** MyFitnessPal's model: exercise raises the day's calorie budget. */
  exerciseAddsCalories: boolean;
  units: "metric" | "imperial";
  theme: Theme;
};

export const DEFAULT_SETTINGS: Settings = {
  exerciseAddsCalories: true,
  units: "metric",
  // The design is built light; dark is available but not the default look.
  theme: "light",
};
