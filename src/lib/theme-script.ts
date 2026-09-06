/**
 * Runs before first paint to stamp the stored theme on <html>, so the page
 * never renders in one theme and then swaps. Reads the same payload the store
 * writes; anything unreadable falls back to the light default rather than
 * blocking the render.
 *
 * This lives in its own module so the Content-Security-Policy in
 * next.config.ts can hash the exact bytes that get inlined. Both the tag and
 * the hash read this one constant, so the policy cannot drift out of step with
 * the script and silently start blocking it.
 */
export const THEME_SCRIPT = `
try {
  var raw = localStorage.getItem("macrolog:v2");
  var theme = raw ? (JSON.parse(raw).settings || {}).theme : null;
  theme = theme || "light";
  if (theme !== "system") document.documentElement.dataset.theme = theme;
} catch (e) {}
`;
