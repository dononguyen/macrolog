"use client";

import { useMemo, useState } from "react";
import { CalorieChart } from "@/components/CalorieChart";
import { WeightChart } from "@/components/WeightChart";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  NumberInput,
  SegmentedControl,
} from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { todayKey } from "@/lib/date";
import { formatWeight, kgToLb, lbToKg } from "@/lib/nutrition";
import {
  averageOverDays,
  dailyTotals,
  dayRange,
  loggingStreak,
  weightChange,
  weightSeries,
} from "@/lib/stats";
import { setWeight } from "@/lib/store";
import {
  NUTRIENT_KEYS,
  NUTRIENT_META,
  type NutrientKey,
} from "@/lib/types";
import { useStore } from "@/lib/useStore";

const WINDOWS = [
  { value: "7", label: "7d" },
  { value: "14", label: "14d" },
  { value: "30", label: "30d" },
] as const;

export default function ProgressPage() {
  const { entries, weights, goals, profile, settings } = useStore();
  const [windowDays, setWindowDays] = useState<"7" | "14" | "30">("14");
  const [logging, setLogging] = useState(false);

  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const days = useMemo(
    () => dayRange(todayKey(), Number(windowDays)),
    [windowDays],
  );
  const { average, loggedDays } = useMemo(
    () => averageOverDays(totals, days),
    [totals, days],
  );

  const series = useMemo(() => weightSeries(weights), [weights]);
  const streak = useMemo(() => loggingStreak(entries), [entries]);
  const change = weightChange(series);
  const latest = series.at(-1);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 sm:px-6">
      <PageHeader title="Progress" subtitle="Weight, intake and consistency over time" />

      <div className="stagger space-y-3.5">

      {/* --------------------------------------------------------- streak */}
      <Card>
        <div className="flex items-center gap-5 px-5 py-5">
          <div>
            <p className="tabular tight text-4xl font-semibold leading-none">
              {streak}
            </p>
            <p className="mt-1 text-xs text-muted">
              day{streak === 1 ? "" : "s"} in a row
            </p>
          </div>
          <p className="flex-1 text-sm text-muted">
            {streak === 0
              ? "Log something today to start a streak."
              : streak < 3
                ? "Good start. Consistency matters more than any single day."
                : "Nicely consistent — that is the part that actually works."}
          </p>
        </div>
      </Card>

      {/* --------------------------------------------------------- weight */}
      <Card
        title="Weight"
        action={
          <button
            onClick={() => setLogging(true)}
            className="pressable rounded-lg px-2 py-1 text-sm font-semibold text-accent-text hover:bg-sunken"
          >
            Log weight
          </button>
        }
      >
        <div className="px-5 pb-5">
          {series.length === 0 ? (
            <EmptyState
              title="No weigh-ins yet"
              hint="Log your weight regularly and the trend will show here."
              action={
                <Button variant="secondary" onClick={() => setLogging(true)}>
                  Log your first weigh-in
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <div>
                  <p className="tabular text-2xl font-semibold leading-none">
                    {formatWeight(latest!.kg, settings.units)}
                  </p>
                  <p className="mt-1 text-xs text-muted">latest</p>
                </div>
                {change !== null && (
                  <div>
                    <p
                      className={`tabular text-lg font-semibold leading-none ${
                        change < 0 ? "text-accent-text" : ""
                      }`}
                    >
                      {change > 0 ? "+" : "−"}
                      {formatWeight(Math.abs(change), settings.units)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      since {series[0].date}
                    </p>
                  </div>
                )}
                {profile?.goalWeightKg !== undefined && (
                  <div>
                    <p className="tabular text-lg font-semibold leading-none">
                      {formatWeight(profile.goalWeightKg, settings.units)}
                    </p>
                    <p className="mt-1 text-xs text-muted">goal</p>
                  </div>
                )}
              </div>

              <WeightChart
                series={series}
                goalKg={profile?.goalWeightKg}
                units={settings.units}
              />
            </>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------- calories */}
      <Card
        title="Calories"
        action={
          <div className="w-40">
            <SegmentedControl
              label="Time range"
              value={windowDays}
              onChange={setWindowDays}
              options={[...WINDOWS]}
            />
          </div>
        }
      >
        <div className="px-5 pb-5">
          {loggedDays === 0 ? (
            <EmptyState
              title="Nothing logged in this range"
              hint="Log a day or two and your intake will chart here."
            />
          ) : (
            <CalorieChart days={days} totals={totals} goalKcal={goals.kcal} />
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------- averages */}
      <Card title={`Daily average over ${windowDays} days`}>
        <div className="px-5 pb-5">
          {loggedDays === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Nothing logged in this range yet.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                Averaged across the {loggedDays} day
                {loggedDays === 1 ? "" : "s"} you logged. Days you skipped are
                left out rather than counted as zero.
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Nutrient</th>
                    <th className="pb-2 text-right font-medium">Average</th>
                    <th className="pb-2 text-right font-medium">Goal</th>
                    <th className="pb-2 text-right font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(NUTRIENT_KEYS as readonly NutrientKey[]).map((key) => {
                    const avg = average[key];
                    const goal = goals[key];
                    const diff = avg - goal;
                    return (
                      <tr key={key}>
                        <td className="py-2">{NUTRIENT_META[key].label}</td>
                        <td className="tabular py-2 text-right font-medium">
                          {Math.round(avg).toLocaleString()}
                          <span className="text-muted">
                            {" "}
                            {NUTRIENT_META[key].unit}
                          </span>
                        </td>
                        <td className="tabular py-2 text-right text-muted">
                          {Math.round(goal).toLocaleString()}
                        </td>
                        <td
                          className={`tabular py-2 text-right ${
                            Math.abs(diff) < goal * 0.05
                              ? "text-muted"
                              : diff > 0
                                ? "text-danger-text"
                                : "text-accent-text"
                          }`}
                        >
                          {diff > 0 ? "+" : "−"}
                          {Math.round(Math.abs(diff)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </Card>

      </div>

      {logging && (
        <LogWeightDialog
          units={settings.units}
          current={latest?.kg}
          onClose={() => setLogging(false)}
        />
      )}
    </main>
  );
}

function LogWeightDialog({
  units,
  current,
  onClose,
}: {
  units: "metric" | "imperial";
  current?: number;
  onClose: () => void;
}) {
  const imperial = units === "imperial";
  const initial = current
    ? imperial
      ? (Math.round(kgToLb(current) * 10) / 10).toString()
      : current.toString()
    : "";
  const [value, setValue] = useState(initial);
  const [date, setDate] = useState(todayKey());

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <Modal
      title="Log weight"
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            setWeight(date, imperial ? lbToKg(parsed) : parsed);
            onClose();
          }}
        >
          Save
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <Field label="Weight" htmlFor="weigh-value">
          <NumberInput
            id="weigh-value"
            autoFocus
            min="1"
            step="0.1"
            suffix={imperial ? "lb" : "kg"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>

        <Field label="Date" htmlFor="weigh-date">
          <input
            id="weigh-date"
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className="tabular w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none focus:border-accent"
          />
        </Field>

        <p className="text-xs text-muted">
          Weighing at the same time of day, before eating, gives the steadiest
          trend. One reading per day is kept.
        </p>
      </div>
    </Modal>
  );
}
