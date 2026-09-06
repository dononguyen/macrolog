"use client";

import {
  DEFAULT_GOALS,
  DEFAULT_SETTINGS,
  normaliseNutrients,
  type Entry,
  type Exercise,
  type Food,
  type Goals,
  type Profile,
  type Recipe,
  type SavedMeal,
  type Settings,
} from "./types";

/**
 * Persistence lives behind this one module so that swapping localStorage for a
 * real backend later is a change here and nowhere else. The app only ever
 * touches the exported hook and actions.
 */

const STORAGE_KEY = "macrolog:v2";
const LEGACY_KEY = "macrolog:v1";

export type AppState = {
  entries: Entry[];
  /** Foods you have logged before, offered as quick picks. */
  library: Food[];
  /** Keys of starred foods, via foodKey(). */
  favorites: string[];
  recipes: Recipe[];
  savedMeals: SavedMeal[];
  exercises: Exercise[];
  /** Date (YYYY-MM-DD) to body weight in kg. */
  weights: Record<string, number>;
  /** Date (YYYY-MM-DD) to water drunk in ml. */
  water: Record<string, number>;
  goals: Goals;
  profile: Profile | null;
  settings: Settings;
};

const EMPTY_STATE: AppState = {
  entries: [],
  library: [],
  favorites: [],
  recipes: [],
  savedMeals: [],
  exercises: [],
  weights: {},
  water: {},
  goals: DEFAULT_GOALS,
  profile: null,
  settings: DEFAULT_SETTINGS,
};

let state: AppState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Identity for deduplicating and starring foods. A USDA id is authoritative;
 * a recipe serving tracks its recipe; anything else falls back to its name.
 */
export function foodKey(food: Food): string {
  if (food.recipeId) return `recipe:${food.recipeId}`;
  if (food.fdcId) return `fdc:${food.fdcId}`;
  return `manual:${food.name.toLowerCase()}|${food.brand?.toLowerCase() ?? ""}`;
}

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota: keep the in-memory state working.
  }
}

function setState(next: AppState) {
  state = next;
  persist();
  emit();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Date-keyed numbers (weights, water). Anything that is not a finite number is
 * dropped rather than carried into the app, where it would surface later as a
 * NaN in a chart or a total.
 */
function asNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    // Skip inherited-looking keys so a crafted payload cannot smuggle one
    // through into an object the app later spreads.
    if (key === "__proto__" || key === "constructor") continue;
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
  }
  return out;
}

/**
 * Rebuild state from stored JSON by naming every field, rather than spreading
 * whatever the payload happens to contain.
 *
 * localStorage is not a trust boundary in the usual sense — anything able to
 * write it already runs script on this origin. The reason to validate is that
 * a truncated or half-written payload is genuinely common, and the failure it
 * causes should be a missing entry rather than a screen of NaN or a crash on
 * load that locks the user out of their own log.
 */
function reviveState(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState> | null;
  if (!parsed || typeof parsed !== "object") return EMPTY_STATE;

  return {
    entries: asArray<Entry>(parsed.entries)
      .filter((entry) => entry && typeof entry === "object" && entry.food)
      .map((entry) => ({
        ...entry,
        food: { ...entry.food, per100g: normaliseNutrients(entry.food?.per100g) },
      })),
    library: asArray<Food>(parsed.library)
      .filter((food) => food && typeof food === "object")
      .map((food) => ({ ...food, per100g: normaliseNutrients(food.per100g) })),
    favorites: asArray<unknown>(parsed.favorites).filter(
      (key): key is string => typeof key === "string",
    ),
    recipes: asArray<Recipe>(parsed.recipes).filter(
      (recipe) => recipe && typeof recipe === "object",
    ),
    savedMeals: asArray<SavedMeal>(parsed.savedMeals).filter(
      (meal) => meal && typeof meal === "object",
    ),
    exercises: asArray<Exercise>(parsed.exercises).filter(
      (exercise) => exercise && typeof exercise === "object",
    ),
    weights: asNumberRecord(parsed.weights),
    water: asNumberRecord(parsed.water),
    goals: { ...DEFAULT_GOALS, ...(parsed.goals ?? {}) },
    profile: parsed.profile && typeof parsed.profile === "object"
      ? parsed.profile
      : null,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}

/**
 * v1 tracked only the four macros. Reviving fills the new nutrients with zero,
 * which is honest: those foods were logged before the data existed, and a
 * guess would be worse than a blank.
 */
function migrateLegacy(): AppState | null {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const migrated = reviveState(raw);
    // Keep the v1 payload in place; if this migration is wrong, the original
    // is still recoverable rather than overwritten.
    return migrated;
  } catch {
    return null;
  }
}

/** Read localStorage once, on the client, after mount. */
export function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = reviveState(raw);
    } else {
      const migrated = migrateLegacy();
      if (migrated) {
        state = migrated;
        persist();
      }
    }
  } catch {
    // Corrupt payload: start clean rather than crash on load.
    state = EMPTY_STATE;
  }
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot() {
  return state;
}

/**
 * Whether the stored data has been read yet. Anything that copies state into
 * a local draft must wait for this: before it, every field reads as empty, and
 * a draft seeded from that would quietly replace real data when saved.
 */
export function isHydrated() {
  return hydrated;
}

export function getServerSnapshot() {
  return EMPTY_STATE;
}

// ---------------------------------------------------------------- actions

function newId() {
  return crypto.randomUUID();
}

/** Push a food to the front of the recents list, deduplicated by identity. */
function withLibrary(library: Food[], foods: Food[]): Food[] {
  const incoming = new Set(foods.map(foodKey));
  return [...foods, ...library.filter((f) => !incoming.has(foodKey(f)))].slice(
    0,
    200,
  );
}

export function addEntry(input: Omit<Entry, "id" | "createdAt">) {
  addEntries([input]);
}

export function addEntries(inputs: Omit<Entry, "id" | "createdAt">[]) {
  if (inputs.length === 0) return;
  const now = Date.now();
  const entries = inputs.map((input, i) => ({
    ...input,
    id: newId(),
    createdAt: now + i,
  }));
  setState({
    ...state,
    entries: [...state.entries, ...entries],
    library: withLibrary(
      state.library,
      entries.map((e) => e.food),
    ),
  });
}

export function updateEntry(
  id: string,
  patch: Partial<Pick<Entry, "grams" | "meal">>,
) {
  setState({
    ...state,
    entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
}

export function removeEntry(id: string) {
  setState({ ...state, entries: state.entries.filter((e) => e.id !== id) });
}

export function toggleFavorite(food: Food) {
  const key = foodKey(food);
  const favorites = state.favorites.includes(key)
    ? state.favorites.filter((f) => f !== key)
    : [...state.favorites, key];
  // Starring a food also files it in the library, so it survives even if it
  // has not been logged recently enough to stay in recents.
  setState({ ...state, favorites, library: withLibrary(state.library, [food]) });
}

export function setGoals(goals: Goals) {
  setState({ ...state, goals });
}

export function setProfile(profile: Profile | null) {
  setState({ ...state, profile });
}

export function setSettings(settings: Settings) {
  setState({ ...state, settings });
}

export function saveRecipe(recipe: Omit<Recipe, "id" | "createdAt"> & { id?: string }) {
  const existing = recipe.id
    ? state.recipes.find((r) => r.id === recipe.id)
    : undefined;
  const next: Recipe = {
    ...recipe,
    id: existing?.id ?? newId(),
    createdAt: existing?.createdAt ?? Date.now(),
  };
  setState({
    ...state,
    recipes: existing
      ? state.recipes.map((r) => (r.id === next.id ? next : r))
      : [next, ...state.recipes],
  });
  return next;
}

export function removeRecipe(id: string) {
  setState({ ...state, recipes: state.recipes.filter((r) => r.id !== id) });
}

export function saveMeal(meal: Omit<SavedMeal, "id" | "createdAt">) {
  const next: SavedMeal = { ...meal, id: newId(), createdAt: Date.now() };
  setState({ ...state, savedMeals: [next, ...state.savedMeals] });
  return next;
}

export function removeSavedMeal(id: string) {
  setState({
    ...state,
    savedMeals: state.savedMeals.filter((m) => m.id !== id),
  });
}

export function addExercise(input: Omit<Exercise, "id" | "createdAt">) {
  setState({
    ...state,
    exercises: [
      ...state.exercises,
      { ...input, id: newId(), createdAt: Date.now() },
    ],
  });
}

export function removeExercise(id: string) {
  setState({
    ...state,
    exercises: state.exercises.filter((e) => e.id !== id),
  });
}

export function setWeight(date: string, kg: number) {
  setState({ ...state, weights: { ...state.weights, [date]: kg } });
}

export function removeWeight(date: string) {
  const weights = { ...state.weights };
  delete weights[date];
  setState({ ...state, weights });
}

export function setWater(date: string, ml: number) {
  setState({
    ...state,
    water: { ...state.water, [date]: Math.max(0, ml) },
  });
}

export function clearAll() {
  setState(EMPTY_STATE);
}
