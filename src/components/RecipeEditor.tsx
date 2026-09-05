"use client";

import { useEffect, useMemo, useState } from "react";
import { saveRecipe } from "@/lib/store";
import type { AppState } from "@/lib/store";
import {
  NUTRIENT_META,
  componentsGrams,
  componentsNutrients,
  mapNutrients,
  type Component,
  type Food,
  type NutrientKey,
  type Recipe,
} from "@/lib/types";
import { Button, EmptyState, Field, Modal, NumberInput, TextInput } from "./ui";

const DEBOUNCE_MS = 350;

/**
 * Builds a recipe from weighed ingredients. Nutrients are computed per 100 g
 * of the finished dish, so the serving count only decides how the total is
 * divided — changing it never alters the underlying numbers.
 */
export function RecipeEditor({
  recipe,
  state,
  onClose,
}: {
  recipe: Recipe | null;
  state: AppState;
  onClose: () => void;
}) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [components, setComponents] = useState<Component[]>(
    recipe?.components ?? [],
  );
  const [adding, setAdding] = useState(false);

  const totals = useMemo(() => componentsNutrients(components), [components]);
  const totalGrams = componentsGrams(components);
  const servingCount = Math.max(1, Number(servings) || 1);
  const perServing = mapNutrients(totals, (v) => v / servingCount);

  const valid = name.trim().length > 0 && components.length > 0;

  return (
    <>
      <Modal
        title={recipe ? "Edit recipe" : "New recipe"}
        onClose={onClose}
        footer={
          <Button
            className="w-full"
            disabled={!valid}
            onClick={() => {
              saveRecipe({
                id: recipe?.id,
                name: name.trim(),
                servings: servingCount,
                components,
              });
              onClose();
            }}
          >
            Save recipe
          </Button>
        }
      >
        <div className="space-y-4 p-4">
          <Field label="Recipe name" htmlFor="recipe-name">
            <TextInput
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chilli con carne"
            />
          </Field>

          <Field
            label="Servings"
            hint="How many portions the finished dish makes."
            htmlFor="recipe-servings"
          >
            <NumberInput
              id="recipe-servings"
              min="1"
              className="w-28"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </Field>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Ingredients</h3>
              <button
                onClick={() => setAdding(true)}
                className="pressable rounded-lg px-2 py-1 text-sm font-semibold text-accent-text hover:bg-sunken"
              >
                + Add ingredient
              </button>
            </div>

            {components.length === 0 ? (
              <p className="mt-2 rounded-xl bg-sunken p-4 text-center text-sm text-muted">
                No ingredients yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {components.map((component, index) => (
                  <li
                    key={`${component.food.id}-${index}`}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {component.food.name}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-muted">
                        {Math.round(
                          (component.food.per100g.kcal * component.grams) / 100,
                        ).toLocaleString()}{" "}
                        kcal
                      </p>
                    </div>
                    <NumberInput
                      aria-label={`Grams of ${component.food.name}`}
                      min="1"
                      suffix="g"
                      className="w-20"
                      value={component.grams}
                      onChange={(e) =>
                        setComponents(
                          components.map((c, i) =>
                            i === index
                              ? { ...c, grams: Number(e.target.value) || 0 }
                              : c,
                          ),
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        setComponents(components.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${component.food.name}`}
                      className="shrink-0 rounded-lg px-1.5 py-1 text-muted hover:bg-sunken hover:text-danger-text"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {components.length > 0 && (
            <div className="rounded-xl bg-sunken p-3">
              <p className="text-xs text-muted">
                Makes {Math.round(totalGrams)} g in total — about{" "}
                {Math.round(totalGrams / servingCount)} g per serving.
              </p>
              <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(["kcal", "protein", "carbs", "fat"] as NutrientKey[]).map(
                  (key) => (
                    <div key={key}>
                      <dt className="text-xs text-muted">
                        {NUTRIENT_META[key].label}
                      </dt>
                      <dd className="tabular mt-0.5 text-sm font-semibold">
                        {Math.round(perServing[key]).toLocaleString()}
                        {key === "kcal" ? "" : " g"}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
              <p className="mt-2 text-center text-xs text-muted">per serving</p>
            </div>
          )}
        </div>
      </Modal>

      {adding && (
        <IngredientPicker
          state={state}
          onClose={() => setAdding(false)}
          onAdd={(component) => {
            setComponents([...components, component]);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}

/** A trimmed-down food search: pick a food, give it a weight, done. */
function IngredientPicker({
  state,
  onAdd,
  onClose,
}: {
  state: AppState;
  onAdd: (c: Component) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setResults(data.foods ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const list = query.trim().length >= 2 ? results : state.library;

  if (picked) {
    return (
      <Modal
        title="How much?"
        onClose={() => setPicked(null)}
        footer={
          <Button
            className="w-full"
            disabled={!(Number(grams) > 0)}
            onClick={() => onAdd({ food: picked, grams: Number(grams) })}
          >
            Add ingredient
          </Button>
        }
      >
        <div className="space-y-4 p-4">
          <p className="font-medium">{picked.name}</p>
          {picked.brand && <p className="text-sm text-muted">{picked.brand}</p>}
          <Field label="Weight" htmlFor="ing-grams">
            <NumberInput
              id="ing-grams"
              min="1"
              autoFocus
              suffix="g"
              className="w-28"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </Field>
          <p className="tabular text-sm text-muted">
            {Math.round(
              (picked.per100g.kcal * (Number(grams) || 0)) / 100,
            ).toLocaleString()}{" "}
            kcal
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add ingredient" onClose={onClose}>
      <div className="border-b border-border p-4">
        <TextInput
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods, e.g. kidney beans"
        />
      </div>

      {searching && (
        <p className="px-4 py-6 text-center text-sm text-muted">Searching…</p>
      )}

      {!searching && list && list.length > 0 && (
        <ul className="divide-y divide-border">
          {list.map((food) => (
            <li key={food.id}>
              <button
                onClick={() => {
                  setPicked(food);
                  setGrams(String(food.servingGrams ?? 100));
                }}
                className="w-full px-4 py-3 text-left hover:bg-sunken"
              >
                <p className="truncate text-sm font-medium">{food.name}</p>
                <p className="tabular mt-0.5 text-xs text-muted">
                  {food.brand ? `${food.brand} · ` : ""}
                  {Math.round(food.per100g.kcal)} kcal per 100 g
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && list && list.length === 0 && (
        <EmptyState
          title={query.trim().length >= 2 ? "No matches found" : "Nothing logged yet"}
          hint="Search above to find an ingredient."
        />
      )}
    </Modal>
  );
}
