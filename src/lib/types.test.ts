import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ZERO_NUTRIENTS,
  componentsNutrients,
  mapNutrients,
  normaliseNutrients,
  recipeToFood,
  scaleNutrients,
  totalNutrients,
  type Entry,
  type Food,
  type Recipe,
} from "./types";

const food = (name: string, kcal: number, protein = 0): Food => ({
  id: name,
  name,
  per100g: { ...ZERO_NUTRIENTS, kcal, protein },
});

test("scaling is linear in grams", () => {
  const per100g = { ...ZERO_NUTRIENTS, kcal: 200, protein: 10 };
  assert.equal(scaleNutrients(per100g, 50).kcal, 100);
  assert.equal(scaleNutrients(per100g, 250).protein, 25);
  assert.equal(scaleNutrients(per100g, 0).kcal, 0);
});

test("normaliseNutrients fills fields a v1 payload never had", () => {
  const legacy = { kcal: 100, protein: 5, carbs: 2, fat: 1 };
  const result = normaliseNutrients(legacy);
  assert.equal(result.kcal, 100);
  assert.equal(result.fiber, 0);
  assert.equal(result.sodium, 0);
  // Undefined input must still produce a complete, zeroed shape.
  assert.deepEqual(normaliseNutrients(undefined), ZERO_NUTRIENTS);
});

test("normaliseNutrients rejects non-finite stored values", () => {
  const corrupt = { kcal: NaN, protein: Infinity } as never;
  const result = normaliseNutrients(corrupt);
  assert.equal(result.kcal, 0);
  assert.equal(result.protein, 0);
});

test("day totals sum every entry at its own weight", () => {
  const entries: Entry[] = [
    {
      id: "a",
      date: "2026-01-01",
      meal: "breakfast",
      food: food("oats", 380, 13),
      grams: 50,
      createdAt: 0,
    },
    {
      id: "b",
      date: "2026-01-01",
      meal: "lunch",
      food: food("chicken", 165, 31),
      grams: 200,
      createdAt: 1,
    },
  ];
  const totals = totalNutrients(entries);
  assert.equal(totals.kcal, 190 + 330);
  assert.equal(totals.protein, 6.5 + 62);
});

test("an empty day totals to zero rather than NaN", () => {
  assert.deepEqual(totalNutrients([]), ZERO_NUTRIENTS);
});

test("recipe nutrients are per 100 g of dish, independent of servings", () => {
  const base: Recipe = {
    id: "r1",
    name: "Chilli",
    servings: 4,
    components: [
      { food: food("mince", 250, 20), grams: 500 },
      { food: food("beans", 100, 7), grams: 500 },
    ],
    createdAt: 0,
  };

  const four = recipeToFood(base);
  const eight = recipeToFood({ ...base, servings: 8 });

  // 1000 g of dish at 1750 kcal total => 175 kcal per 100 g, whatever the
  // serving count. Only the serving weight should move.
  assert.equal(Math.round(four.per100g.kcal), 175);
  assert.deepEqual(four.per100g, eight.per100g);
  assert.equal(four.servingGrams, 250);
  assert.equal(eight.servingGrams, 125);
});

test("one serving of a recipe carries a quarter of a four-serving dish", () => {
  const recipe: Recipe = {
    id: "r2",
    name: "Stew",
    servings: 4,
    components: [{ food: food("beef", 200, 26), grams: 800 }],
    createdAt: 0,
  };
  const asFood = recipeToFood(recipe);
  const perServing = scaleNutrients(asFood.per100g, asFood.servingGrams!);
  const total = componentsNutrients(recipe.components);

  assert.equal(Math.round(perServing.kcal), Math.round(total.kcal / 4));
});

test("a recipe with no ingredients does not divide by zero", () => {
  const empty = recipeToFood({
    id: "r3",
    name: "Nothing",
    servings: 2,
    components: [],
    createdAt: 0,
  });
  assert.deepEqual(empty.per100g, ZERO_NUTRIENTS);
  assert.equal(empty.servingGrams, undefined);
});

test("mapNutrients touches every tracked key", () => {
  const ones = mapNutrients(ZERO_NUTRIENTS, () => 1);
  assert.equal(Object.values(ones).every((v) => v === 1), true);
  assert.equal(Object.keys(ones).length, 9);
});
