"use client";

import { useState } from "react";
import { RecipeEditor } from "@/components/RecipeEditor";
import { Button, Card, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { foodKey, removeRecipe, removeSavedMeal, toggleFavorite } from "@/lib/store";
import {
  componentsNutrients,
  recipeToFood,
  scaleNutrients,
  type Recipe,
} from "@/lib/types";
import { useStore } from "@/lib/useStore";

export default function FoodsPage() {
  const state = useStore();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  const favourites = state.library.filter((f) =>
    state.favorites.includes(foodKey(f)),
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 sm:px-6">
      <PageHeader title="Foods" subtitle="Recipes, saved meals and starred foods" />

      <div className="stagger space-y-3.5">

      {/* -------------------------------------------------------- recipes */}
      <Card
        title="Recipes"
        action={
          <button
            onClick={() => setCreating(true)}
            className="pressable rounded-lg px-2 py-1 text-sm font-semibold text-accent-text hover:bg-sunken"
          >
            + New recipe
          </button>
        }
      >
        {state.recipes.length === 0 ? (
          <EmptyState
            title="No recipes yet"
            hint="Build a dish once from its ingredients, then log it by the serving."
            action={
              <Button variant="secondary" onClick={() => setCreating(true)}>
                Create a recipe
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {state.recipes.map((recipe) => {
              const food = recipeToFood(recipe);
              const perServing = scaleNutrients(
                food.per100g,
                food.servingGrams ?? 100,
              );
              return (
                <li key={recipe.id} className="flex items-center">
                  <button
                    onClick={() => setEditing(recipe)}
                    className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-sunken"
                  >
                    <p className="truncate text-sm font-medium">{recipe.name}</p>
                    <p className="tabular mt-0.5 text-xs text-muted">
                      {recipe.servings} serving
                      {recipe.servings === 1 ? "" : "s"} ·{" "}
                      {Math.round(perServing.kcal).toLocaleString()} kcal each ·{" "}
                      {Math.round(perServing.protein)}p{" "}
                      {Math.round(perServing.carbs)}c{" "}
                      {Math.round(perServing.fat)}f
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete the recipe "${recipe.name}"?`)) {
                        removeRecipe(recipe.id);
                      }
                    }}
                    aria-label={`Delete ${recipe.name}`}
                    className="shrink-0 px-4 py-3 text-muted hover:text-danger-text"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ---------------------------------------------------- saved meals */}
      <Card title="Saved meals">
        {state.savedMeals.length === 0 ? (
          <EmptyState
            title="No saved meals"
            hint="On the diary, log a meal then tap Save as meal to keep it for next time."
          />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {state.savedMeals.map((meal) => {
              const totals = componentsNutrients(meal.components);
              return (
                <li key={meal.id} className="flex items-center">
                  <div className="min-w-0 flex-1 px-4 py-3">
                    <p className="truncate text-sm font-medium">{meal.name}</p>
                    <p className="tabular mt-0.5 text-xs text-muted">
                      {meal.components.length} item
                      {meal.components.length === 1 ? "" : "s"} ·{" "}
                      {Math.round(totals.kcal).toLocaleString()} kcal ·{" "}
                      {Math.round(totals.protein)}p {Math.round(totals.carbs)}c{" "}
                      {Math.round(totals.fat)}f
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete the saved meal "${meal.name}"?`)) {
                        removeSavedMeal(meal.id);
                      }
                    }}
                    aria-label={`Delete ${meal.name}`}
                    className="shrink-0 px-4 py-3 text-muted hover:text-danger-text"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ----------------------------------------------------- favourites */}
      <Card title="Starred foods">
        {favourites.length === 0 ? (
          <EmptyState
            title="Nothing starred"
            hint="Tap the star beside a food when logging it to keep it here."
          />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {favourites.map((food) => (
              <li key={foodKey(food)} className="flex items-center">
                <div className="min-w-0 flex-1 px-4 py-3">
                  <p className="truncate text-sm font-medium">{food.name}</p>
                  <p className="tabular mt-0.5 text-xs text-muted">
                    {food.brand ? `${food.brand} · ` : ""}
                    {Math.round(food.per100g.kcal)} kcal per 100 g
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(food)}
                  aria-label={`Unstar ${food.name}`}
                  className="shrink-0 px-4 py-3 text-lg leading-none text-carbs"
                >
                  ★
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      </div>

      {(creating || editing) && (
        <RecipeEditor
          recipe={editing}
          state={state}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
