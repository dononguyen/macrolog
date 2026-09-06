"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  hydrate,
  isHydrated,
  subscribe,
  type AppState,
} from "./store";

/**
 * Reads persisted state. Renders the empty state on the server and on the very
 * first client paint, then swaps in the stored data once hydrated — this keeps
 * React's hydration check happy without a flash of wrong numbers.
 */
export function useStore(): AppState {
  useEffect(() => {
    hydrate();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * False until the stored data has been read. Screens that seed an editable
 * draft from the store must hold that draft back until this is true, or the
 * draft captures the empty state and saving overwrites what was stored.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, isHydrated, () => false);
}
