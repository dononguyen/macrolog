"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/useStore";

/**
 * Mirrors the stored theme onto the document so a change in Settings applies
 * immediately. The first paint is handled by the inline script in the layout,
 * which runs before React and so avoids a flash of the wrong theme; this only
 * keeps the two in step afterwards.
 */
export function ThemeSync() {
  const { settings } = useStore();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  return null;
}
