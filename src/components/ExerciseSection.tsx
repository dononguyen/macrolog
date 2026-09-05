"use client";

import { useState } from "react";
import { addExercise, removeExercise } from "@/lib/store";
import type { Exercise } from "@/lib/types";
import { Button, Card, Field, Modal, NumberInput, TextInput } from "./ui";

/**
 * Rough kcal per minute for a 70 kg person, used only to prefill the field —
 * the number stays editable, because burn varies far too much between people
 * for a preset to be treated as a measurement.
 */
const PRESETS: { name: string; kcalPerMin: number }[] = [
  { name: "Walking", kcalPerMin: 4 },
  { name: "Running", kcalPerMin: 11 },
  { name: "Cycling", kcalPerMin: 8 },
  { name: "Swimming", kcalPerMin: 9 },
  { name: "Weights", kcalPerMin: 5 },
  { name: "Yoga", kcalPerMin: 3 },
];

export function ExerciseSection({
  date,
  exercises,
  addsCalories,
}: {
  date: string;
  exercises: Exercise[];
  addsCalories: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const total = exercises.reduce((sum, e) => sum + e.kcal, 0);

  return (
    <>
      <Card
        title="Exercise"
        action={
          <span className="tabular text-sm text-muted">
            {total > 0 ? `${total.toLocaleString()} kcal` : ""}
          </span>
        }
      >
        {exercises.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {exercises.map((exercise) => (
              <li
                key={exercise.id}
                className="group flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exercise.name}</p>
                  {exercise.minutes > 0 && (
                    <p className="tabular mt-0.5 text-xs text-muted">
                      {exercise.minutes} min
                    </p>
                  )}
                </div>
                <span className="tabular shrink-0 text-sm">
                  {exercise.kcal.toLocaleString()}
                </span>
                <button
                  onClick={() => removeExercise(exercise.id)}
                  aria-label={`Remove ${exercise.name}`}
                  className="shrink-0 rounded-lg px-1.5 py-1 text-muted opacity-0 transition-opacity hover:bg-sunken hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-2">
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-xl py-2 text-sm font-medium text-accent hover:bg-sunken"
          >
            + Add exercise
          </button>
        </div>

        {!addsCalories && total > 0 && (
          <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
            Recorded, but not added to today&apos;s calories — you turned that
            off in settings.
          </p>
        )}
      </Card>

      {adding && <AddExercise date={date} onClose={() => setAdding(false)} />}
    </>
  );
}

function AddExercise({ date, onClose }: { date: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [kcal, setKcal] = useState("");
  const [touchedKcal, setTouchedKcal] = useState(false);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setName(preset.name);
    const mins = Number(minutes) || 0;
    // Only prefill while the user has not typed their own number, so a preset
    // never silently overwrites a figure from a watch or a machine.
    if (!touchedKcal) setKcal(String(Math.round(preset.kcalPerMin * mins)));
  };

  const valid = name.trim().length > 0 && Number(kcal) >= 0 && kcal.trim() !== "";

  return (
    <Modal
      title="Add exercise"
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            addExercise({
              date,
              name: name.trim(),
              minutes: Number(minutes) || 0,
              kcal: Math.max(0, Math.round(Number(kcal))),
            });
            onClose();
          }}
        >
          Add exercise
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-border px-3 py-1 text-sm hover:bg-sunken"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <Field label="Activity" htmlFor="ex-name">
          <TextInput
            id="ex-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Evening walk"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration" htmlFor="ex-min">
            <NumberInput
              id="ex-min"
              min="0"
              suffix="min"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </Field>

          <Field label="Calories burned" htmlFor="ex-kcal">
            <NumberInput
              id="ex-kcal"
              min="0"
              suffix="kcal"
              value={kcal}
              onChange={(e) => {
                setTouchedKcal(true);
                setKcal(e.target.value);
              }}
            />
          </Field>
        </div>

        <p className="text-xs text-muted">
          Presets estimate roughly for a 70 kg person. If your watch or a machine
          gave you a figure, use that instead — burn varies a lot between people.
        </p>
      </div>
    </Modal>
  );
}
