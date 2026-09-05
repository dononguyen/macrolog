"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Field,
  NumberInput,
  SegmentedControl,
  Select,
  Toggle,
} from "@/components/ui";
import {
  ACTIVITY_LEVELS,
  MACRO_SPLITS,
  bmr,
  cmToFeetInches,
  feetInchesToCm,
  goalCalories,
  goalsFromProfile,
  isRateClamped,
  kgToLb,
  lbToKg,
  splitOfGoals,
  tdee,
  type MacroSplitKey,
} from "@/lib/nutrition";
import { clearAll, setGoals, setProfile, setSettings } from "@/lib/store";
import {
  NUTRIENT_KEYS,
  NUTRIENT_META,
  type ActivityLevel,
  type Goals,
  type NutrientKey,
  type Profile,
  type Sex,
} from "@/lib/types";
import { useStore } from "@/lib/useStore";

const BLANK_PROFILE: Profile = {
  sex: "female",
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activity: "light",
  rateKgPerWeek: -0.5,
};

/** Weekly rates offered, in kg. MFP tops out around 1 kg (2 lb) a week. */
const RATES = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5] as const;

export default function SettingsPage() {
  const { profile, goals, settings } = useStore();
  const [draft, setDraft] = useState<Profile>(profile ?? BLANK_PROFILE);
  const [split, setSplit] = useState<MacroSplitKey>("balanced");
  const [saved, setSaved] = useState(false);

  const imperial = settings.units === "imperial";
  const projected = useMemo(() => goalsFromProfile(draft, split), [draft, split]);
  const clamped = isRateClamped(draft);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft({ ...draft, [key]: value });
    setSaved(false);
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-6 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>

      {/* ------------------------------------------------------- profile */}
      <Card title="About you">
        <div className="space-y-4 px-4 pb-4">
          <p className="text-sm text-muted">
            Used to estimate how much you burn. Nothing leaves your browser.
          </p>

          <Field label="Sex">
            <SegmentedControl<Sex>
              label="Sex"
              value={draft.sex}
              onChange={(v) => set("sex", v)}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" htmlFor="age">
              <NumberInput
                id="age"
                min="14"
                max="100"
                suffix="years"
                value={draft.age || ""}
                onChange={(e) => set("age", Number(e.target.value))}
              />
            </Field>

            <Field label="Weight" htmlFor="weight">
              <NumberInput
                id="weight"
                min="1"
                step="0.1"
                suffix={imperial ? "lb" : "kg"}
                value={
                  imperial
                    ? Math.round(kgToLb(draft.weightKg) * 10) / 10 || ""
                    : draft.weightKg || ""
                }
                onChange={(e) =>
                  set(
                    "weightKg",
                    imperial ? lbToKg(Number(e.target.value)) : Number(e.target.value),
                  )
                }
              />
            </Field>
          </div>

          <Field label="Height">
            {imperial ? (
              <div className="flex gap-3">
                <NumberInput
                  aria-label="Height in feet"
                  min="1"
                  suffix="ft"
                  value={cmToFeetInches(draft.heightCm).feet || ""}
                  onChange={(e) =>
                    set(
                      "heightCm",
                      feetInchesToCm(
                        Number(e.target.value),
                        cmToFeetInches(draft.heightCm).inches,
                      ),
                    )
                  }
                />
                <NumberInput
                  aria-label="Height in inches"
                  min="0"
                  max="11"
                  suffix="in"
                  value={cmToFeetInches(draft.heightCm).inches || ""}
                  onChange={(e) =>
                    set(
                      "heightCm",
                      feetInchesToCm(
                        cmToFeetInches(draft.heightCm).feet,
                        Number(e.target.value),
                      ),
                    )
                  }
                />
              </div>
            ) : (
              <NumberInput
                aria-label="Height in centimetres"
                min="1"
                suffix="cm"
                value={Math.round(draft.heightCm) || ""}
                onChange={(e) => set("heightCm", Number(e.target.value))}
              />
            )}
          </Field>

          <Field
            label="Activity level"
            hint="Everyday movement, not counting workouts you log."
            htmlFor="activity"
          >
            <Select
              id="activity"
              value={draft.activity}
              onChange={(e) => set("activity", e.target.value as ActivityLevel)}
            >
              {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                <option key={key} value={key}>
                  {level.label} — {level.hint}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Weekly goal" htmlFor="rate">
            <Select
              id="rate"
              value={draft.rateKgPerWeek}
              onChange={(e) => set("rateKgPerWeek", Number(e.target.value))}
            >
              {RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate === 0
                    ? "Maintain weight"
                    : `${rate < 0 ? "Lose" : "Gain"} ${
                        imperial
                          ? `${Math.abs(kgToLb(rate)).toFixed(1)} lb`
                          : `${Math.abs(rate)} kg`
                      } a week`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Goal weight" hint="Optional. Shown on your progress chart.">
            <NumberInput
              min="1"
              step="0.1"
              suffix={imperial ? "lb" : "kg"}
              value={
                draft.goalWeightKg === undefined
                  ? ""
                  : imperial
                    ? Math.round(kgToLb(draft.goalWeightKg) * 10) / 10
                    : draft.goalWeightKg
              }
              onChange={(e) => {
                const raw = e.target.value;
                set(
                  "goalWeightKg",
                  raw === ""
                    ? undefined
                    : imperial
                      ? lbToKg(Number(raw))
                      : Number(raw),
                );
              }}
            />
          </Field>
        </div>
      </Card>

      {/* ------------------------------------------------ calculated plan */}
      <Card title="Your calculated targets">
        <div className="space-y-4 px-4 pb-4">
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-sunken p-3 text-center">
            {[
              ["Resting burn", Math.round(bmr(draft))],
              ["Daily burn", Math.round(tdee(draft))],
              ["Your target", goalCalories(draft)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="tabular mt-0.5 font-semibold">
                  {(value as number).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-muted">
            Estimated with the Mifflin-St Jeor equation, then scaled by your
            activity level. A kilogram is treated as 7,700 kcal.
          </p>

          {clamped && (
            <p className="rounded-xl bg-sunken p-3 text-xs text-danger">
              That rate would put you below {draft.sex === "male" ? "1,500" : "1,200"}{" "}
              kcal, so the target has been held there. Choose a slower rate for a
              deficit you can actually keep to.
            </p>
          )}

          <Field label="Macro split">
            <SegmentedControl<MacroSplitKey>
              label="Macro split"
              value={split}
              onChange={setSplit}
              options={Object.entries(MACRO_SPLITS).map(([key, s]) => ({
                value: key,
                label: s.label,
              }))}
            />
            <p className="mt-1.5 text-xs text-muted">
              {MACRO_SPLITS[split].hint}
            </p>
          </Field>

          <dl className="grid grid-cols-4 gap-2 text-center">
            {(["kcal", "protein", "carbs", "fat"] as NutrientKey[]).map((key) => (
              <div key={key} className="rounded-xl bg-sunken p-2.5">
                <dt className="text-xs text-muted">{NUTRIENT_META[key].label}</dt>
                <dd className="tabular mt-0.5 text-sm font-semibold">
                  {Math.round(projected[key]).toLocaleString()}
                  <span className="font-normal text-muted">
                    {key === "kcal" ? "" : " g"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <Button
            className="w-full"
            onClick={() => {
              setProfile(draft);
              setGoals(projected);
              setSaved(true);
            }}
          >
            {saved ? "Targets applied" : "Save and apply these targets"}
          </Button>
        </div>
      </Card>

      <ManualGoals goals={goals} />

      {/* --------------------------------------------------- preferences */}
      <Card title="Preferences">
        <div className="space-y-4 px-4 pb-4">
          <Field label="Units">
            <SegmentedControl
              label="Units"
              value={settings.units}
              onChange={(units) => setSettings({ ...settings, units })}
              options={[
                { value: "metric", label: "Metric (kg, cm)" },
                { value: "imperial", label: "Imperial (lb, ft)" },
              ]}
            />
          </Field>

          <Toggle
            label="Exercise adds to your calories"
            hint="On: a logged workout raises the day's budget, as MyFitnessPal does. Off: workouts are recorded but your target holds."
            checked={settings.exerciseAddsCalories}
            onChange={(exerciseAddsCalories) =>
              setSettings({ ...settings, exerciseAddsCalories })
            }
          />
        </div>
      </Card>

      {/* ---------------------------------------------------------- data */}
      <Card title="Your data">
        <div className="space-y-3 px-4 pb-4">
          <p className="text-sm text-muted">
            Everything is stored in this browser only. It is not uploaded, and
            it will not follow you to another device.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  "Delete every log, recipe, weight and goal? This cannot be undone.",
                )
              ) {
                clearAll();
              }
            }}
          >
            Delete all data
          </Button>
        </div>
      </Card>
    </main>
  );
}

/** Direct editing, for anyone who already knows the numbers they want. */
function ManualGoals({ goals }: { goals: Goals }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const value = (key: NutrientKey | "water") =>
    draft[key] ?? String(Math.round(goals[key]));

  const split = splitOfGoals(goals);

  return (
    <Card
      title="Fine-tune targets"
      action={
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-medium text-accent"
        >
          {open ? "Close" : "Edit"}
        </button>
      }
    >
      <div className="px-4 pb-4">
        <p className="text-sm text-muted">
          Currently {Math.round(split.protein * 100)}% protein ·{" "}
          {Math.round(split.carbs * 100)}% carbs · {Math.round(split.fat * 100)}%
          fat.
        </p>

        {open && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([...NUTRIENT_KEYS, "water"] as (NutrientKey | "water")[]).map(
                (key) => (
                  <Field
                    key={key}
                    label={key === "water" ? "Water" : NUTRIENT_META[key].label}
                    htmlFor={`goal-${key}`}
                  >
                    <NumberInput
                      id={`goal-${key}`}
                      min="0"
                      suffix={key === "water" ? "ml" : NUTRIENT_META[key].unit}
                      value={value(key)}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </Field>
                ),
              )}
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => {
                const next = { ...goals };
                for (const key of [...NUTRIENT_KEYS, "water"] as (
                  | NutrientKey
                  | "water"
                )[]) {
                  const raw = draft[key];
                  if (raw !== undefined && raw.trim() !== "") {
                    next[key] = Math.max(0, Number(raw) || 0);
                  }
                }
                setGoals(next);
                setDraft({});
                setOpen(false);
              }}
            >
              Save targets
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
