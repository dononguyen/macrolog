import type { Goals, Nutrients } from "@/lib/types";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const ratio = goal > 0 ? consumed / goal : 0;
  // The ring fills to the goal and stops; going over is shown by colour and by
  // the negative number in the middle, not by a second lap.
  const dash = CIRCUMFERENCE * Math.min(ratio, 1);
  const over = consumed > goal;
  const remaining = Math.round(goal - consumed);

  return (
    <div className="relative shrink-0">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke={over ? "var(--danger)" : "var(--accent)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          transform="rotate(-90 70 70)"
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-3xl font-semibold leading-none">
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="mt-1 text-xs text-muted">
          {over ? "over" : "left"}
        </span>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const over = consumed > goal;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted">
          <span className={over ? "text-danger" : "text-fg"}>
            {Math.round(consumed)}
          </span>
          {" / "}
          {Math.round(goal)} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: over ? "var(--danger)" : color }}
        />
      </div>
    </div>
  );
}

export function MacroSummary({
  totals,
  goals,
}: {
  totals: Nutrients;
  goals: Goals;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <CalorieRing consumed={totals.kcal} goal={goals.kcal} />

        <div className="w-full flex-1 space-y-3.5">
          <div className="flex items-baseline justify-between border-b border-border pb-3 text-sm">
            <span className="font-medium">Calories</span>
            <span className="tabular text-muted">
              <span className="text-fg">{Math.round(totals.kcal).toLocaleString()}</span>
              {" / "}
              {goals.kcal.toLocaleString()} kcal
            </span>
          </div>
          <MacroBar
            label="Protein"
            consumed={totals.protein}
            goal={goals.protein}
            color="var(--protein)"
          />
          <MacroBar
            label="Carbs"
            consumed={totals.carbs}
            goal={goals.carbs}
            color="var(--carbs)"
          />
          <MacroBar
            label="Fat"
            consumed={totals.fat}
            goal={goals.fat}
            color="var(--fat)"
          />
        </div>
      </div>
    </section>
  );
}
