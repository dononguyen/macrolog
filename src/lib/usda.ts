import type { Food, Macros } from "./types";

/**
 * Mapping for the USDA FoodData Central search API. Kept free of any network
 * or framework code so the awkward parts — unit conversion, missing
 * nutrients — are plain functions.
 *
 * https://fdc.nal.usda.gov/api-guide.html
 */

const NUTRIENT_IDS = {
  energyKcal: 1008,
  /** Some records only carry Atwater-derived energy. */
  energyAtwaterGeneral: 2047,
  energyAtwaterSpecific: 2048,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
} as const;

export type UsdaNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

export type UsdaFood = {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
};

export type UsdaSearchResponse = {
  foods?: UsdaFood[];
  totalHits?: number;
};

function nutrientValue(food: UsdaFood, id: number): number | undefined {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id);
  return typeof n?.value === "number" ? n.value : undefined;
}

/** Energy is occasionally reported in kJ; normalise everything to kcal. */
function energyKcal(food: UsdaFood): number {
  const direct = food.foodNutrients?.find(
    (n) => n.nutrientId === NUTRIENT_IDS.energyKcal,
  );
  if (typeof direct?.value === "number") {
    return direct.unitName?.toLowerCase() === "kj"
      ? direct.value / 4.184
      : direct.value;
  }
  return (
    nutrientValue(food, NUTRIENT_IDS.energyAtwaterSpecific) ??
    nutrientValue(food, NUTRIENT_IDS.energyAtwaterGeneral) ??
    0
  );
}

/** USDA search results report nutrients per 100 g, which is what we store. */
function macrosPer100g(food: UsdaFood): Macros {
  return {
    kcal: energyKcal(food),
    protein: nutrientValue(food, NUTRIENT_IDS.protein) ?? 0,
    carbs: nutrientValue(food, NUTRIENT_IDS.carbs) ?? 0,
    fat: nutrientValue(food, NUTRIENT_IDS.fat) ?? 0,
  };
}

/**
 * Only trust a serving size we can express in grams. Millilitres would need a
 * density we do not have, so those fall back to grams-only entry.
 */
function servingGrams(food: UsdaFood): number | undefined {
  const unit = food.servingSizeUnit?.toLowerCase();
  if (!food.servingSize || !unit) return undefined;
  if (unit === "g" || unit === "grm") return food.servingSize;
  return undefined;
}

function titleCase(s: string): string {
  // USDA descriptions are frequently SHOUTED, especially branded items.
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function toFood(food: UsdaFood): Food {
  return {
    id: `usda-${food.fdcId}`,
    fdcId: food.fdcId,
    name: titleCase(food.description?.trim() || "Unnamed food"),
    brand: (food.brandName || food.brandOwner)?.trim()
      ? titleCase((food.brandName || food.brandOwner)!.trim())
      : undefined,
    per100g: macrosPer100g(food),
    servingGrams: servingGrams(food),
    servingLabel: food.householdServingFullText?.trim() || undefined,
  };
}

/**
 * USDA ranks purely by text relevance, so a search for "chicken breast"
 * returns twelve supermarket packets before the raw ingredient. Whole-food
 * datasets are promoted above branded ones, relevance preserved within each
 * group.
 */
const DATA_TYPE_RANK: Record<string, number> = {
  Foundation: 0,
  "SR Legacy": 1,
  "Survey (FNDDS)": 2,
  Branded: 3,
};

function dataTypeRank(food: UsdaFood): number {
  return DATA_TYPE_RANK[food.dataType ?? ""] ?? 4;
}

export function toFoods(response: UsdaSearchResponse): Food[] {
  return (response.foods ?? [])
    .map((food, index) => ({ food, index }))
    .sort(
      (a, b) =>
        dataTypeRank(a.food) - dataTypeRank(b.food) || a.index - b.index,
    )
    .map(({ food }) => toFood(food))
    // A result with no energy and no macros is noise in a calorie tracker.
    .filter(
      (f) =>
        f.per100g.kcal > 0 ||
        f.per100g.protein > 0 ||
        f.per100g.carbs > 0 ||
        f.per100g.fat > 0,
    );
}
