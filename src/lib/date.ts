/** All dates in the app are local calendar days keyed as YYYY-MM-DD. */

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function shiftKey(key: string, days: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** "Today", "Yesterday", or e.g. "Mon, 3 Mar". */
export function labelForKey(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";
  if (key === shiftKey(today, -1)) return "Yesterday";
  if (key === shiftKey(today, 1)) return "Tomorrow";
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
