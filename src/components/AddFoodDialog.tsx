"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addEntry } from "@/lib/store";
import {
  MEAL_LABELS,
  scaleMacros,
  type Food,
  type MealSlot,
} from "@/lib/types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

type Step = "search" | "portion" | "manual";

/** The outcome of one completed search, tagged with the query it answers. */
type SearchState = {
  query: string;
  status: "ok" | "error";
  foods: Food[];
  error: string | null;
};

export function AddFoodDialog({
  date,
  meal,
  recents,
  onClose,
}: {
  date: string;
  meal: MealSlot;
  recents: Food[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("search");
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Add food to ${MEAL_LABELS[meal]}`}
      >
        {step === "portion" && selected ? (
          <PortionStep
            food={selected}
            date={date}
            meal={meal}
            onBack={() => setStep("search")}
            onDone={onClose}
          />
        ) : step === "manual" ? (
          <ManualStep
            date={date}
            meal={meal}
            onBack={() => setStep("search")}
            onDone={onClose}
          />
        ) : (
          <SearchStep
            meal={meal}
            query={query}
            setQuery={setQuery}
            active={active}
            results={results}
            recents={recents}
            searching={searching}
            error={error}
            onPick={(food) => {
              setSelected(food);
              setStep("portion");
            }}
            onManual={() => setStep("manual")}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ search

function SearchStep({
  meal,
  query,
  setQuery,
  active,
  results,
  recents,
  searching,
  error,
  onPick,
  onManual,
  onClose,
}: {
  meal: MealSlot;
  query: string;
  setQuery: (v: string) => void;
  active: boolean;
  results: Food[] | null;
  recents: Food[];
  searching: boolean;
  error: string | null;
  onPick: (f: Food) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showingRecents = !active;
  const list = showingRecents ? recents : results;

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Add to {MEAL_LABELS[meal]}</h2>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunken"
        >
          Cancel
        </button>
      </header>

      <div className="border-b border-border p-4">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods, e.g. greek yogurt"
          className="w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="px-4 py-3 text-sm text-danger">{error}</p>}

        {searching && (
          <p className="px-4 py-6 text-center text-sm text-muted">Searching…</p>
        )}

        {!searching && list && list.length > 0 && (
          <>
            {showingRecents && (
              <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-muted">
                Recent
              </p>
            )}
            <ul className="divide-y divide-border">
              {list.map((food) => (
                <li key={food.id}>
                  <button
                    onClick={() => onPick(food)}
                    className="w-full px-4 py-3 text-left hover:bg-sunken"
                  >
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="tabular mt-0.5 text-xs text-muted">
                      {food.brand ? `${food.brand} · ` : ""}
                      {Math.round(food.per100g.kcal)} kcal ·{" "}
                      {Math.round(food.per100g.protein)}p{" "}
                      {Math.round(food.per100g.carbs)}c{" "}
                      {Math.round(food.per100g.fat)}f per 100 g
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!searching && !error && list && list.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {showingRecents
              ? "Nothing logged yet — search to get started."
              : "No matches found."}
          </p>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <button
          onClick={onManual}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-sunken"
        >
          Enter macros manually
        </button>
      </footer>
    </>
  );
}

// ----------------------------------------------------------------- portion

function PortionStep({
  food,
  date,
  meal,
  onBack,
  onDone,
}: {
  food: Food;
  date: string;
  meal: MealSlot;
  onBack: () => void;
  onDone: () => void;
}) {
  const [grams, setGrams] = useState(String(food.servingGrams ?? 100));
  const parsed = Number(grams);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const preview = useMemo(
    () => scaleMacros(food.per100g, valid ? parsed : 0),
    [food.per100g, parsed, valid],
  );

  const presets = useMemo(() => {
    const values = new Set<number>([50, 100, 200]);
    if (food.servingGrams) values.add(food.servingGrams);
    return [...values].sort((a, b) => a - b);
  }, [food.servingGrams]);

  const tiles: [string, string, string][] = [
    ["kcal", Math.round(preview.kcal).toLocaleString(), "var(--fg)"],
    ["protein", `${Math.round(preview.protein)} g`, "var(--protein)"],
    ["carbs", `${Math.round(preview.carbs)} g`, "var(--carbs)"],
    ["fat", `${Math.round(preview.fat)} g`, "var(--fat)"],
  ];

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunken"
        >
          Back
        </button>
        <h2 className="font-semibold">Portion</h2>
        <span className="w-12" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="font-medium">{food.name}</p>
        {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
        {food.servingLabel && (
          <p className="mt-1 text-xs text-muted">
            Label serving: {food.servingLabel}
            {food.servingGrams ? ` (${food.servingGrams} g)` : ""}
          </p>
        )}

        <label className="mt-5 block text-sm font-medium" htmlFor="grams">
          Amount
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="grams"
            type="number"
            inputMode="decimal"
            min="1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="tabular w-32 rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none focus:border-accent"
          />
          <span className="text-sm text-muted">grams</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((g) => (
            <button
              key={g}
              onClick={() => setGrams(String(g))}
              className="tabular rounded-full border border-border px-3 py-1 text-sm hover:bg-sunken"
            >
              {g} g{g === food.servingGrams ? " · serving" : ""}
            </button>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-sunken p-3 text-center">
          {tiles.map(([label, value, color]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="tabular mt-0.5 font-semibold" style={{ color }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="border-t border-border p-3">
        <button
          disabled={!valid}
          onClick={() => {
            addEntry({ date, meal, food, grams: parsed });
            onDone();
          }}
          className="w-full rounded-xl bg-accent py-2.5 font-medium text-white disabled:opacity-40"
        >
          Add to {MEAL_LABELS[meal]}
        </button>
      </footer>
    </>
  );
}

// ------------------------------------------------------------------ manual

function ManualStep({
  date,
  meal,
  onBack,
  onDone,
}: {
  date: string;
  meal: MealSlot;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
  const valid =
    name.trim().length > 0 &&
    [kcal, protein, carbs, fat].every(
      (v) => v.trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
    );

  const fields: [string, string, (v: string) => void][] = [
    ["Calories (kcal)", kcal, setKcal],
    ["Protein (g)", protein, setProtein],
    ["Carbs (g)", carbs, setCarbs],
    ["Fat (g)", fat, setFat],
  ];

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunken"
        >
          Back
        </button>
        <h2 className="font-semibold">Manual entry</h2>
        <span className="w-12" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <label className="block text-sm font-medium" htmlFor="manual-name">
          Food name
        </label>
        <input
          id="manual-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leftover lasagne"
          className="mt-1.5 w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent"
        />

        <p className="mt-5 text-xs text-muted">
          Enter the totals for the whole portion you ate.
        </p>

        <div className="mt-2 grid grid-cols-2 gap-3">
          {fields.map(([label, value, set]) => (
            <div key={label}>
              <label className="block text-sm font-medium">{label}</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="0"
                className="tabular mt-1.5 w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-border p-3">
        <button
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
                per100g: {
                  kcal: num(kcal),
                  protein: num(protein),
                  carbs: num(carbs),
                  fat: num(fat),
                },
              },
            });
            onDone();
          }}
          className="w-full rounded-xl bg-accent py-2.5 font-medium text-white disabled:opacity-40"
        >
          Add to {MEAL_LABELS[meal]}
        </button>
      </footer>
    </>
  );
}
