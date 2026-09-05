"use client";

import {
  DEFAULT_GOALS,
  type Entry,
  type Food,
  type Goals,
} from "./types";

/**
 * Persistence lives behind this one module so that swapping localStorage for a
 * real backend later is a change here and nowhere else. The app only ever
 * touches the exported hook and actions.
 */

const STORAGE_KEY = "macrolog:v1";

export type AppState = {
  entries: Entry[];
  /** Foods you have logged before, offered as quick picks. */
  library: Food[];
  goals: Goals;
};

const EMPTY_STATE: AppState = {
  entries: [],
  library: [],
  goals: DEFAULT_GOALS,
};

let state: AppState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
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

/** Read localStorage once, on the client, after mount. */
export function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      state = {
        entries: parsed.entries ?? [],
        library: parsed.library ?? [],
        goals: { ...DEFAULT_GOALS, ...(parsed.goals ?? {}) },
      };
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

export function getServerSnapshot() {
  return EMPTY_STATE;
}

export function isHydrated() {
  return hydrated;
}

// ---------------------------------------------------------------- actions

function newId() {
  return crypto.randomUUID();
}

export function addEntry(input: Omit<Entry, "id" | "createdAt">) {
  const entry: Entry = { ...input, id: newId(), createdAt: Date.now() };

  // Keep the food library deduplicated by USDA id, falling back to name+brand
  // for manual entries.
  const key = (f: Food) =>
    f.fdcId ? `fdc:${f.fdcId}` : `manual:${f.name}|${f.brand ?? ""}`;
  const library = [
    entry.food,
    ...state.library.filter((f) => key(f) !== key(entry.food)),
  ].slice(0, 100);

  setState({ ...state, entries: [...state.entries, entry], library });
}

export function updateEntry(id: string, patch: Partial<Pick<Entry, "grams" | "meal">>) {
  setState({
    ...state,
    entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
}

export function removeEntry(id: string) {
  setState({ ...state, entries: state.entries.filter((e) => e.id !== id) });
}

export function setGoals(goals: Goals) {
  setState({ ...state, goals });
}

export function clearAll() {
  setState(EMPTY_STATE);
}
