"use client";

import { removeEntry } from "@/lib/store";
import {
  MEAL_LABELS,
  entryNutrients,
  type Entry,
  type MealSlot,
} from "@/lib/types";
import { MacroChips } from "./ui";

/** A quiet colour per meal, carried by the tile and the meal label. */
const MEAL_TINT: Record<MealSlot, string> = {
  breakfast: "var(--carbs)",
  lunch: "var(--protein)",
  dinner: "var(--fat)",
  snack: "var(--accent)",
};

/**
 * Everything eaten that day, in the order it was logged. There are no per-meal
 * sections: the meal is a property of an entry, chosen when it is added, and
 * shown here as a label rather than as a heading you have to file food under.
 */
export function FoodLog({
  title,
  entries,
  onAdd,
  onSaveAsMeal,
}: {
  title: string;
  entries: Entry[];
  onAdd: () => void;
  onSaveAsMeal: () => void;
}) {
  const ordered = [...entries].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <section>
      <header className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="tight text-base font-semibold">{title}</h2>
        {ordered.length > 0 && (
          <button
            onClick={onSaveAsMeal}
            className="pressable rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-sunken hover:text-fg"
          >
            Save as meal
          </button>
        )}
      </header>

      {ordered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold">Nothing logged yet</p>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-sm text-muted">
            Tap the plus button to add a food and pick which meal it was.
          </p>
          <button
            onClick={onAdd}
            className="pressable mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent"
          >
            Add your first food
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {ordered.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const macros = entryNutrients(entry);
  const tint = MEAL_TINT[entry.meal];

  return (
    <li className="group flex items-center gap-3 rounded-3xl border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
      {/* No photos in this app, so the tile carries the food's initial over
          its meal colour rather than leaving a grey square. */}
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
        style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)`, color: tint }}
      >
        {entry.food.name.trim().charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{entry.food.name}</p>
        <p className="tabular mt-0.5 text-xs text-muted">
          {MEAL_LABELS[entry.meal]}
          <span className="text-faint">
            {" · "}
            {new Date(entry.createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
            {" · "}
            {entry.grams} g
          </span>
        </p>
        <MacroChips nutrients={macros} className="mt-1.5" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="tabular text-sm font-bold">
          {Math.round(macros.kcal).toLocaleString()}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-faint">
          kcal
        </span>
      </div>

      <button
        onClick={() => removeEntry(entry.id)}
        aria-label={`Remove ${entry.food.name}`}
        className="pressable shrink-0 rounded-lg p-1.5 text-faint opacity-0 hover:bg-danger-soft hover:text-danger-text focus-visible:opacity-100 group-hover:opacity-100"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}
