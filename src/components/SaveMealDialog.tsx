"use client";

import { useState } from "react";
import { saveMeal } from "@/lib/store";
import {
  MEAL_LABELS,
  totalNutrients,
  type Entry,
  type MealSlot,
} from "@/lib/types";
import { Button, Field, Modal, TextInput } from "./ui";

/**
 * Turns what is already on the plate into a reusable meal, so a regular
 * breakfast is logged once and then recalled in a tap.
 */
export function SaveMealDialog({
  entries,
  meal,
  onClose,
}: {
  entries: Entry[];
  meal: MealSlot;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const totals = totalNutrients(entries);

  return (
    <Modal
      title={`Save ${MEAL_LABELS[meal].toLowerCase()} as a meal`}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          disabled={name.trim().length === 0 || entries.length === 0}
          onClick={() => {
            saveMeal({
              name: name.trim(),
              components: entries.map((e) => ({ food: e.food, grams: e.grams })),
            });
            onClose();
          }}
        >
          Save meal
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <Field label="Name this meal" htmlFor="meal-name">
          <TextInput
            id="meal-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Usual breakfast"
          />
        </Field>

        <div>
          <p className="text-sm font-medium">
            {entries.length} item{entries.length === 1 ? "" : "s"} ·{" "}
            {Math.round(totals.kcal).toLocaleString()} kcal
          </p>
          <ul className="mt-2 space-y-1">
            {entries.map((entry) => (
              <li key={entry.id} className="tabular text-sm text-muted">
                {entry.food.name} — {entry.grams} g
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted">
          Saved meals keep a copy of each food, so editing them later will not
          change days you have already logged.
        </p>
      </div>
    </Modal>
  );
}
