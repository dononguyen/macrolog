"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addEntries, addEntry, foodKey, toggleFavorite } from "@/lib/store";
import type { AppState } from "@/lib/store";
import {
  MACRO_KEYS,
  MEAL_LABELS,
  MEAL_SLOTS,
  MICRO_KEYS,
  NUTRIENT_KEYS,
  NUTRIENT_META,
  ZERO_NUTRIENTS,
  componentsNutrients,
  mapNutrients,
  recipeToFood,
  scaleNutrients,
  type Component,
  type Food,
  type MealSlot,
  type NutrientKey,
} from "@/lib/types";
import {
  Button,
  EmptyState,
  Field,
  MacroChips,
  NumberInput,
  SegmentedControl,
  TextInput,
} from "./ui";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

type Step = "browse" | "portion" | "manual";
type Tab = "recents" | "favourites" | "meals" | "recipes";

const TABS: { value: Tab; label: string }[] = [
  { value: "recents", label: "Recent" },
  { value: "favourites", label: "Starred" },
  { value: "meals", label: "Meals" },
  { value: "recipes", label: "Recipes" },
];

/** The outcome of one completed search, tagged with the query it answers. */
type SearchState = {
  query: string;
  status: "ok" | "error";
  foods: Food[];
  error: string | null;
};

export function AddFoodDialog({
  date,
  initialMeal,
  state,
  onClose,
}: {
  date: string;
  /** Pre-selected from the clock; the picker below is the real choice. */
  initialMeal: MealSlot;
  state: AppState;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [step, setStep] = useState<Step>("browse");
  const [tab, setTab] = useState<Tab>("recents");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY_LENGTH;

  // Everything the search UI needs is derived from whether the stored result
  // answers the query currently in the box. Holding no separate "loading" flag
  // means the two can never disagree.
  const current = active && search?.query === trimmed ? search : null;
  const searching = active && current === null;
  const results = current?.status === "ok" ? current.foods : null;
  const error = current?.status === "error" ? current.error : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced search. Each keystroke aborts the request in flight, and every
  // result is tagged with its query, so a slow response can never overwrite
  // the results of a newer one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setSearch(
          res.ok
            ? { query: q, status: "ok", foods: data.foods ?? [], error: null }
            : {
                query: q,
                status: "error",
                foods: [],
                error: data.error ?? "Search failed.",
              },
        );
      } catch {
        if (!controller.signal.aborted) {
          setSearch({
            query: q,
            status: "error",
            foods: [],
            error: "Could not reach the food database.",
          });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  /** Saved meals go straight in — their portions were fixed when saved. */
  const logComponents = (components: Component[]) => {
    addEntries(
      components.map((c) => ({ date, meal, food: c.food, grams: c.grams })),
    );
    onClose();
  };

  /**
   * One selection, shown in every step, so the meal is settled before you
   * commit whichever way you are logging — search, manual or a saved meal.
   */
  const mealPicker = (
    <div className="shrink-0 border-b border-border px-4 py-3">
      <SegmentedControl<MealSlot>
        label="Meal"
        value={meal}
        onChange={setMeal}
        options={MEAL_SLOTS.map((slot) => ({
          value: slot,
          label: MEAL_LABELS[slot],
        }))}
      />
    </div>
  );

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-panel flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-[var(--shadow-lg)] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add food"
      >
        {step === "portion" && selected ? (
          <PortionStep
            food={selected}
            date={date}
            meal={meal}
            mealPicker={mealPicker}
            favourite={state.favorites.includes(foodKey(selected))}
            onBack={() => setStep("browse")}
            onDone={onClose}
          />
        ) : step === "manual" ? (
          <ManualStep
            date={date}
            meal={meal}
            mealPicker={mealPicker}
            onBack={() => setStep("browse")}
            onDone={onClose}
          />
        ) : (
          <BrowseStep
            mealPicker={mealPicker}
            state={state}
            query={query}
            setQuery={setQuery}
            tab={tab}
            setTab={setTab}
            active={active}
            results={results}
            searching={searching}
            error={error}
            onPick={(food) => {
              setSelected(food);
              setStep("portion");
            }}
            onLogComponents={logComponents}
            onManual={() => setStep("manual")}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ browse

/**
 * One result. USDA names run long and the old single-line summary crushed the
 * brand, the calories and three macros into one unreadable sentence, then
 * truncated it. Each of those is its own thing to look at here, laid out like
 * the diary rows so a food looks the same before and after you log it.
 */
function FoodRow({
  food,
  subtitle,
  favourite,
  onPick,
  onToggleFavourite,
}: {
  food: Food;
  subtitle?: string;
  favourite?: boolean;
  onPick: () => void;
  onToggleFavourite?: () => void;
}) {
  const serving = food.servingLabel
    ? food.servingGrams
      ? `${food.servingLabel} · ${food.servingGrams} g`
      : food.servingLabel
    : food.servingGrams
      ? `Serving ${food.servingGrams} g`
      : null;

  const detail = subtitle ?? [food.brand, serving].filter(Boolean).join(" · ");

  return (
    <li className="flex items-center">
      <button
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
      >
        {/* No photos in this app, so the tile carries the food's initial
            rather than leaving an empty grey square. */}
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sunken text-base font-bold text-muted"
        >
          {food.name.trim().charAt(0).toUpperCase()}
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold">{food.name}</span>
          {detail && (
            <span className="mt-0.5 block truncate text-xs text-muted">
              {detail}
            </span>
          )}
          <MacroChips nutrients={food.per100g} className="mt-1.5" />
        </span>

        <span className="shrink-0 text-right">
          <span className="tabular block text-sm font-bold">
            {Math.round(food.per100g.kcal).toLocaleString()}
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wide text-faint">
            per 100 g
          </span>
        </span>
      </button>
      {onToggleFavourite && (
        <button
          onClick={onToggleFavourite}
          aria-label={favourite ? `Unstar ${food.name}` : `Star ${food.name}`}
          aria-pressed={favourite}
          className={`shrink-0 px-4 py-3 text-lg leading-none transition-colors ${
            favourite ? "text-carbs" : "text-muted hover:text-fg"
          }`}
        >
          {favourite ? "★" : "☆"}
        </button>
      )}
    </li>
  );
}

function BrowseStep({
  mealPicker,
  state,
  query,
  setQuery,
  tab,
  setTab,
  active,
  results,
  searching,
  error,
  onPick,
  onLogComponents,
  onManual,
  onClose,
}: {
  mealPicker: ReactNode;
  state: AppState;
  query: string;
  setQuery: (v: string) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  active: boolean;
  results: Food[] | null;
  searching: boolean;
  error: string | null;
  onPick: (f: Food) => void;
  onLogComponents: (c: Component[]) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const favouriteFoods = useMemo(
    () => state.library.filter((f) => state.favorites.includes(foodKey(f))),
    [state.library, state.favorites],
  );

  const isFavourite = (food: Food) => state.favorites.includes(foodKey(food));

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="font-semibold">Add food</h2>
        <button
          onClick={onClose}
          className="pressable rounded-xl px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
        >
          Cancel
        </button>
      </header>

      {mealPicker}

      <div className="shrink-0 border-b border-border p-4">
        <TextInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods, e.g. greek yogurt"
        />
      </div>

      {!active && (
        <div className="flex gap-1 border-b border-border px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-accent-soft text-accent-text"
                  : "text-muted hover:bg-sunken hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {active ? (
          <>
            {error && <p className="px-4 py-3 text-sm text-danger-text">{error}</p>}
            {searching && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Searching…
              </p>
            )}
            {!searching && results && results.length > 0 && (
              <ul className="divide-y divide-border">
                {results.map((food) => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    favourite={isFavourite(food)}
                    onPick={() => onPick(food)}
                    onToggleFavourite={() => toggleFavorite(food)}
                  />
                ))}
              </ul>
            )}
            {!searching && !error && results && results.length === 0 && (
              <EmptyState title="No matches found" />
            )}
          </>
        ) : tab === "recents" ? (
          state.library.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              hint="Search above to find a food, or enter the macros by hand."
            />
          ) : (
            <ul className="divide-y divide-border">
              {state.library.map((food) => (
                <FoodRow
                  key={foodKey(food)}
                  food={food}
                  favourite={isFavourite(food)}
                  onPick={() => onPick(food)}
                  onToggleFavourite={() => toggleFavorite(food)}
                />
              ))}
            </ul>
          )
        ) : tab === "favourites" ? (
          favouriteFoods.length === 0 ? (
            <EmptyState
              title="No starred foods"
              hint="Tap the star beside a food to keep it here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {favouriteFoods.map((food) => (
                <FoodRow
                  key={foodKey(food)}
                  food={food}
                  favourite
                  onPick={() => onPick(food)}
                  onToggleFavourite={() => toggleFavorite(food)}
                />
              ))}
            </ul>
          )
        ) : tab === "meals" ? (
          state.savedMeals.length === 0 ? (
            <EmptyState
              title="No saved meals"
              hint="Log a meal, then use Save as meal on the diary to keep it."
            />
          ) : (
            <ul className="divide-y divide-border">
              {state.savedMeals.map((savedMeal) => {
                const totals = componentsNutrients(savedMeal.components);
                return (
                  <li key={savedMeal.id}>
                    <button
                      onClick={() => onLogComponents(savedMeal.components)}
                      className="w-full px-5 py-3 text-left transition-colors hover:bg-sunken"
                    >
                      <p className="text-sm font-medium">{savedMeal.name}</p>
                      <p className="tabular mt-0.5 text-xs text-muted">
                        {savedMeal.components.length} item
                        {savedMeal.components.length === 1 ? "" : "s"} ·{" "}
                        {Math.round(totals.kcal).toLocaleString()} kcal
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : state.recipes.length === 0 ? (
          <EmptyState
            title="No recipes yet"
            hint="Build one on the Foods tab to log it by the serving."
          />
        ) : (
          <ul className="divide-y divide-border">
            {state.recipes.map((recipe) => {
              const food = recipeToFood(recipe);
              const perServing = scaleNutrients(
                food.per100g,
                food.servingGrams ?? 100,
              );
              return (
                <FoodRow
                  key={recipe.id}
                  food={food}
                  subtitle={`${recipe.servings} serving${
                    recipe.servings === 1 ? "" : "s"
                  } · ${Math.round(perServing.kcal).toLocaleString()} kcal each`}
                  onPick={() => onPick(food)}
                />
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <Button variant="secondary" className="w-full" onClick={onManual}>
          Enter macros manually
        </Button>
      </footer>
    </>
  );
}

// ----------------------------------------------------------------- portion

function PortionStep({
  food,
  date,
  meal,
  mealPicker,
  favourite,
  onBack,
  onDone,
}: {
  food: Food;
  date: string;
  meal: MealSlot;
  mealPicker: ReactNode;
  favourite: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const [grams, setGrams] = useState(String(food.servingGrams ?? 100));
  const parsed = Number(grams);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const preview = useMemo(
    () => scaleNutrients(food.per100g, valid ? parsed : 0),
    [food.per100g, parsed, valid],
  );

  const presets = useMemo(() => {
    const values = new Set<number>([50, 100, 200]);
    if (food.servingGrams) values.add(food.servingGrams);
    return [...values].sort((a, b) => a - b);
  }, [food.servingGrams]);

  const tiles: [NutrientKey, string][] = [
    ["kcal", "var(--fg)"],
    ["protein", "var(--protein)"],
    ["carbs", "var(--carbs)"],
    ["fat", "var(--fat)"],
  ];

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <button
          onClick={onBack}
          className="pressable rounded-xl px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
        >
          Back
        </button>
        <h2 className="font-semibold">Portion</h2>
        <button
          onClick={() => toggleFavorite(food)}
          aria-label={favourite ? "Unstar this food" : "Star this food"}
          aria-pressed={favourite}
          className={`px-2 text-lg leading-none ${
            favourite ? "text-carbs" : "text-muted hover:text-fg"
          }`}
        >
          {favourite ? "★" : "☆"}
        </button>
      </header>

      {mealPicker}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="font-medium">{food.name}</p>
        {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
        {food.servingLabel && (
          <p className="mt-1 text-xs text-muted">
            {food.recipeId ? "" : "Label serving: "}
            {food.servingLabel}
            {food.servingGrams ? ` (${food.servingGrams} g)` : ""}
          </p>
        )}

        <div className="mt-5">
          <Field label="Amount" htmlFor="grams">
            <NumberInput
              id="grams"
              min="1"
              suffix="grams"
              className="w-32"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((g) => (
            <button
              key={g}
              onClick={() => setGrams(String(g))}
              className="pressable tabular rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:border-border-strong hover:bg-sunken"
            >
              {g} g{g === food.servingGrams ? " · serving" : ""}
            </button>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-sunken p-3 text-center">
          {tiles.map(([key, color]) => (
            <div key={key}>
              <dt className="text-xs text-muted">{NUTRIENT_META[key].label}</dt>
              <dd className="tabular mt-0.5 font-semibold" style={{ color }}>
                {Math.round(preview[key]).toLocaleString()}
                {key === "kcal" ? "" : " g"}
              </dd>
            </div>
          ))}
        </dl>

        <dl className="mt-3 grid grid-cols-5 gap-2 text-center">
          {MICRO_KEYS.map((key) => (
            <div key={key} className="rounded-xl bg-sunken p-2">
              <dt className="text-[11px] text-muted">
                {NUTRIENT_META[key].short}
              </dt>
              <dd className="tabular mt-0.5 text-sm">
                {Math.round(preview[key]).toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="border-t border-border p-3">
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            addEntry({ date, meal, food, grams: parsed });
            onDone();
          }}
        >
          Add to {MEAL_LABELS[meal]}
        </Button>
      </footer>
    </>
  );
}

// ------------------------------------------------------------------ manual

function ManualStep({
  date,
  meal,
  mealPicker,
  onBack,
  onDone,
}: {
  date: string;
  meal: MealSlot;
  mealPicker: ReactNode;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);

  const num = (key: NutrientKey) => Number(values[key] ?? "") || 0;

  const valid =
    name.trim().length > 0 &&
    NUTRIENT_KEYS.every((key) => {
      const raw = values[key]?.trim();
      return !raw || (Number.isFinite(Number(raw)) && Number(raw) >= 0);
    });

  const field = (key: NutrientKey) => (
    <Field
      key={key}
      label={`${NUTRIENT_META[key].label} (${NUTRIENT_META[key].unit})`}
      htmlFor={`manual-${key}`}
    >
      <NumberInput
        id={`manual-${key}`}
        min="0"
        placeholder="0"
        value={values[key] ?? ""}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <button
          onClick={onBack}
          className="pressable rounded-xl px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
        >
          Back
        </button>
        <h2 className="font-semibold">Manual entry</h2>
        <span className="w-12" />
      </header>

      {mealPicker}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Field label="Food name" htmlFor="manual-name">
          <TextInput
            id="manual-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leftover lasagne"
          />
        </Field>

        <p className="mt-5 text-xs text-muted">
          Enter the totals for the whole portion you ate.
        </p>

        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["kcal", ...MACRO_KEYS] as NutrientKey[]).map(field)}
        </div>

        <button
          onClick={() => setShowMore(!showMore)}
          className="pressable mt-4 rounded-lg text-sm font-semibold text-accent-text hover:underline"
        >
          {showMore ? "Hide" : "Add"} fibre, sugar, sodium…
        </button>

        {showMore && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(MICRO_KEYS as readonly NutrientKey[]).map(field)}
          </div>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            // A manual food is defined by the portion eaten, so it is stored as
            // a 100 g food logged at exactly 100 g. Everything downstream then
            // treats it identically to a food from the database.
            addEntry({
              date,
              meal,
              grams: 100,
              food: {
                id: crypto.randomUUID(),
                name: name.trim(),
                per100g: mapNutrients(ZERO_NUTRIENTS, (_, key) => num(key)),
              },
            });
            onDone();
          }}
        >
          Add to {MEAL_LABELS[meal]}
        </Button>
      </footer>
    </>
  );
}
