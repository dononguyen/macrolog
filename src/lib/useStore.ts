"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  hydrate,
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
