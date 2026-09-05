"use client";

import { useEffect, useState } from "react";
import { setGoals } from "@/lib/store";
import type { Goals } from "@/lib/types";

/**
 * Protein and fat are the macros people actually target; carbohydrate is
 * usually whatever calories remain. This is surfaced as a hint rather than
 * enforced, so the four fields stay independently editable.
 */
function impliedKcal(g: Goals): number {
  return g.protein * 4 + g.carbs * 4 + g.fat * 9;
}

export function GoalsDialog({
  goals,
  onClose,
}: {
  goals: Goals;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    kcal: String(goals.kcal),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parse = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const parsed: Goals = {
    kcal: parse(draft.kcal),
    protein: parse(draft.protein),
    carbs: parse(draft.carbs),
    fat: parse(draft.fat),
  };

  const valid = Object.values(draft).every(
    (v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0,
  );

  const implied = impliedKcal(parsed);
  const drift = implied - parsed.kcal;
  const mismatched = valid && parsed.kcal > 0 && Math.abs(drift) > 50;

  const fields: [keyof typeof draft, string, string][] = [
    ["kcal", "Calories", "kcal"],
    ["protein", "Protein", "g"],
    ["carbs", "Carbs", "g"],
    ["fat", "Fat", "g"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily goals"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">Daily goals</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunken"
          >
            Cancel
          </button>
        </header>

        <div className="space-y-3 p-4">
          {fields.map(([key, label, unit]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium" htmlFor={`goal-${key}`}>
                {label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`goal-${key}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                  className="tabular w-24 rounded-xl border border-border bg-sunken px-3 py-2 text-right text-base outline-none focus:border-accent"
                />
                <span className="w-8 text-sm text-muted">{unit}</span>
              </div>
            </div>
          ))}

          {mismatched && (
            <p className="rounded-xl bg-sunken p-3 text-xs text-muted">
              Those macros work out to{" "}
              <span className="tabular font-medium text-fg">
                {implied.toLocaleString()} kcal
              </span>
              , {drift > 0 ? "above" : "below"} your calorie goal by{" "}
              <span className="tabular">{Math.abs(drift).toLocaleString()}</span>
              . That is fine if it is deliberate.
            </p>
          )}
        </div>

        <footer className="border-t border-border p-3">
          <button
            disabled={!valid}
            onClick={() => {
              setGoals(parsed);
              onClose();
            }}
            className="w-full rounded-xl bg-accent py-2.5 font-medium text-white disabled:opacity-40"
          >
            Save goals
          </button>
        </footer>
      </div>
    </div>
  );
}
