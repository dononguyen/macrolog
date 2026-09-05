"use client";

import { useState } from "react";
import { addEntry } from "@/lib/store";
import {
  MACRO_KEYS,
  MEAL_LABELS,
  MEAL_SLOTS,
  NUTRIENT_META,
  ZERO_NUTRIENTS,
  mapNutrients,
  type MealSlot,
  type NutrientKey,
} from "@/lib/types";
import { Button, Field, Modal, NumberInput, SegmentedControl } from "./ui";

/**
 * For food you cannot be bothered to look up: a calorie figure, optionally
 * with macros. Stored as a 100 g food logged at 100 g so every total
 * downstream treats it like anything else.
 */
export function QuickAddDialog({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState<MealSlot>("snack");
  const [values, setValues] = useState<Record<string, string>>({});

  const num = (key: NutrientKey) => Number(values[key] ?? "") || 0;
  const valid = (values.kcal ?? "").trim() !== "" && num("kcal") >= 0;

  return (
    <Modal
      title="Quick add"
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            addEntry({
              date,
              meal,
              grams: 100,
              food: {
                id: crypto.randomUUID(),
                name: "Quick add",
                per100g: mapNutrients(ZERO_NUTRIENTS, (_, key) => num(key)),
              },
            });
            onClose();
          }}
        >
          Add {num("kcal").toLocaleString()} kcal
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <Field label="Meal">
          <SegmentedControl<MealSlot>
            label="Meal"
            value={meal}
            onChange={setMeal}
            options={MEAL_SLOTS.map((slot) => ({
              value: slot,
              label: MEAL_LABELS[slot],
            }))}
          />
        </Field>

        <Field label="Calories" htmlFor="qa-kcal">
          <NumberInput
            id="qa-kcal"
            min="0"
            autoFocus
            suffix="kcal"
            value={values.kcal ?? ""}
            onChange={(e) => setValues({ ...values, kcal: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          {MACRO_KEYS.map((key) => (
            <Field key={key} label={NUTRIENT_META[key].label} htmlFor={`qa-${key}`}>
              <NumberInput
                id={`qa-${key}`}
                min="0"
                placeholder="0"
                value={values[key] ?? ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>

        <p className="text-xs text-muted">
          Macros are optional — leave them blank if you only know the calories.
        </p>
      </div>
    </Modal>
  );
}
