import assert from "node:assert/strict";
import { test } from "node:test";
import { toFood, toFoods, type UsdaFood } from "./usda";

const nutrient = (id: number, value: number, unitName = "G") => ({
  nutrientId: id,
  value,
  unitName,
});

const base: UsdaFood = {
  fdcId: 1,
  description: "Test food",
  dataType: "Foundation",
  foodNutrients: [nutrient(1008, 200, "KCAL"), nutrient(1003, 10)],
};

test("energy reported in kJ is converted to kcal", () => {
  const food = toFood({
    ...base,
    foodNutrients: [nutrient(1008, 836.8, "kJ")],
  });
  // 836.8 kJ / 4.184 = 200 kcal
  assert.equal(Math.round(food.per100g.kcal), 200);
});

test("Atwater energy is used when no direct kcal figure exists", () => {
  const specific = toFood({
    ...base,
    foodNutrients: [nutrient(2048, 150, "KCAL")],
  });
  assert.equal(specific.per100g.kcal, 150);
});

test("a record with no energy at all reports zero rather than NaN", () => {
  const food = toFood({ ...base, foodNutrients: [nutrient(1003, 10)] });
  assert.equal(food.per100g.kcal, 0);
});

test("legacy sugar id is used when the current one is absent", () => {
  const legacy = toFood({ ...base, foodNutrients: [nutrient(1063, 12)] });
  assert.equal(legacy.per100g.sugar, 12);

  // When both exist the current id wins.
  const both = toFood({
    ...base,
    foodNutrients: [nutrient(2000, 5), nutrient(1063, 12)],
  });
  assert.equal(both.per100g.sugar, 5);
});

test("serving size is only trusted when it is expressed in grams", () => {
  assert.equal(
    toFood({ ...base, servingSize: 30, servingSizeUnit: "g" }).servingGrams,
    30,
  );
  assert.equal(
    toFood({ ...base, servingSize: 30, servingSizeUnit: "GRM" }).servingGrams,
    30,
  );
  // Millilitres would need a density we do not have.
  assert.equal(
    toFood({ ...base, servingSize: 240, servingSizeUnit: "ml" }).servingGrams,
    undefined,
  );
});

test("shouted branded descriptions are title-cased, mixed case is left alone", () => {
  assert.equal(
    toFood({ ...base, description: "CHICKEN BREAST", brandName: "TYSON" }).name,
    "Chicken Breast",
  );
  assert.equal(
    toFood({ ...base, description: "Chicken, breast, raw" }).name,
    "Chicken, breast, raw",
  );
});

test("whole foods are ranked above branded ones, relevance kept within a group", () => {
  const ranked = toFoods({
    foods: [
      { ...base, fdcId: 1, description: "Brand A", dataType: "Branded" },
      { ...base, fdcId: 2, description: "Brand B", dataType: "Branded" },
      { ...base, fdcId: 3, description: "SR item", dataType: "SR Legacy" },
      { ...base, fdcId: 4, description: "Foundation item", dataType: "Foundation" },
    ],
  });

  assert.deepEqual(
    ranked.map((f) => f.fdcId),
    [4, 3, 1, 2],
  );
});

test("results with no energy and no macros are dropped as noise", () => {
  const foods = toFoods({
    foods: [
      { ...base, fdcId: 1 },
      { fdcId: 2, description: "Empty", dataType: "Branded", foodNutrients: [] },
    ],
  });
  assert.equal(foods.length, 1);
  assert.equal(foods[0].fdcId, 1);
});

test("an empty or malformed payload yields an empty list", () => {
  assert.deepEqual(toFoods({}), []);
  assert.deepEqual(toFoods({ foods: [] }), []);
});
