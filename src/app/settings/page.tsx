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
import { PageHeader } from "@/components/PageHeader";
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
  nearestSplit,
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
import { useHydrated, useStore } from "@/lib/useStore";

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
  const hydrated = useHydrated();

  const imperial = settings.units === "imperial";

  return (
    // The generous bottom padding leaves room for the save bar, which floats
    // above the tab bar and would otherwise cover the last card.
    <main className="mx-auto w-full max-w-2xl px-4 pb-44 sm:px-6">
      <PageHeader title="Settings" subtitle="Your profile, targets and preferences" />

      <div className="stagger space-y-3.5">

      {/*
        * The only part of this screen that copies stored data into an editable
        * draft, so the only part that must wait for the store to be read.
        * Mounting it sooner seeds the form from the empty state, and saving
        * then writes that over the real profile.
        */}
      {hydrated ? (
        <ProfilePlan profile={profile} goals={goals} imperial={imperial} />
      ) : (
        <PlanPlaceholder />
      )}

      <ManualGoals goals={goals} />

      {/* --------------------------------------------------- preferences */}
      <Card title="Preferences">
        <div className="space-y-4 px-5 pb-5">
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
        <div className="space-y-3 px-5 pb-5">
          <p className="text-sm text-muted">
            Your log, goals, weight and profile are stored in this browser only.
            They are not uploaded, and will not follow you to another device.
          </p>
          <p className="text-sm text-muted">
            The one exception: when you search for a food, the words you type
            are sent to the USDA food database to look up. What you actually log
            is never sent anywhere.
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
      </div>

    </main>
  );
}

/** Holds the shape of the card while the store is read, so nothing jumps. */
function PlanPlaceholder() {
  return (
    <Card title="About you">
      <div className="space-y-3 px-5 pb-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-2xl bg-sunken" />
        ))}
      </div>
    </Card>
  );
}

/**
 * Your body stats and the targets they produce. The draft is deliberately
 * local, so a half-typed weight does not move your goals mid-keystroke — but
 * that means nothing here is kept until the button is pressed, which is what
 * the "Unsaved" marker and the note under the button are for.
 */
function ProfilePlan({
  profile,
  goals,
  imperial,
}: {
  profile: Profile | null;
  goals: Goals;
  imperial: boolean;
}) {
  const [draft, setDraft] = useState<Profile>(profile ?? BLANK_PROFILE);
  // Re-open on the split the stored goals represent, not on the default:
  // resetting the picker here would misreport the targets you are running,
  // and the next save would rewrite them to a split you never chose.
  const [split, setSplit] = useState<MacroSplitKey>(() => nearestSplit(goals));

  const projected = useMemo(() => goalsFromProfile(draft, split), [draft, split]);
  const clamped = isRateClamped(draft);
  // Kept apart on purpose. The badge is about the profile card it sits on;
  // the button is about everything a save would write, so hand-edited targets
  // in "Fine-tune" leave the button live without branding the profile unsaved.
  const profileSaved = sameProfile(draft, profile);
  const stored = profileSaved && sameGoals(projected, goals);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft({ ...draft, [key]: value });
  };

  return (
    <>
      {/* ------------------------------------------------------- profile */}
      <Card
        title="About you"
        action={
          !profileSaved && (
            <span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-muted">
              Unsaved
            </span>
          )
        }
      >
        <div className="space-y-4 px-5 pb-5">
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
        <div className="space-y-4 px-5 pb-5">
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
            <p className="rounded-xl bg-sunken p-3 text-xs text-danger-text">
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

          <p className="text-center text-xs text-muted">
            {stored
              ? "These are your saved targets."
              : "These apply once you save."}
          </p>
        </div>
      </Card>

      {/*
        * The fields and the targets they produce are one form split across two
        * cards, so a button inside either one is missable from the other. This
        * follows the screen instead, and only exists when there is something
        * to keep.
        */}
      {!stored && (
        <div
          className="animate-fade-up fixed inset-x-0 z-40 px-4 sm:px-6"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-elevated/90 p-2.5 pl-4 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <p className="min-w-0 flex-1 text-sm font-medium">
              Unsaved changes
              <span className="block text-xs font-normal text-muted">
                Your details and targets are not kept until you save.
              </span>
            </p>
            <Button
              className="shrink-0"
              onClick={() => {
                setProfile(draft);
                setGoals(projected);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Both derived rather than remembered, so they become true the moment a save
 * lands and false again as soon as anything moves — including the macro split,
 * which changes the targets without touching a single profile field.
 */
function sameProfile(draft: Profile, profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    (Object.keys(BLANK_PROFILE) as (keyof Profile)[]).every(
      (key) => draft[key] === profile[key],
    ) && draft.goalWeightKg === profile.goalWeightKg
  );
}

function sameGoals(projected: Goals, goals: Goals): boolean {
  return (Object.keys(goals) as (keyof Goals)[]).every(
    (key) => projected[key] === goals[key],
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
          className="pressable rounded-lg px-2 py-1 text-sm font-semibold text-accent-text hover:bg-sunken"
        >
          {open ? "Close" : "Edit"}
        </button>
      }
    >
      <div className="px-5 pb-5">
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
