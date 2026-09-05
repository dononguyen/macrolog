# macrolog

A calorie and macro tracker. Log what you eat against targets worked out from
your own body stats, then see whether it is actually going anywhere.

Built with Next.js (App Router), TypeScript and Tailwind. Food data comes from
the USDA FoodData Central database. Everything is stored in your browser.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Food search API key

Search works out of the box using USDA's shared `DEMO_KEY`, which is rate
limited to roughly 30 requests per hour — enough to try the app, not enough to
use it. A personal key is free and takes about a minute:

1. Request one at https://fdc.nal.usda.gov/api-key-signup.html
2. `cp .env.example .env.local`
3. Paste the key into `USDA_API_KEY` and restart the dev server.

The key is only ever read on the server, so it never reaches the browser.

## What it does

**Diary** — Four meals a day, searched from USDA or entered by hand. Tracks
calories, protein, carbs, fat, fibre, sugar, saturated fat, sodium and
cholesterol. Logs exercise and water. The calorie budget is spelled out as
`Goal − Food + Exercise = Left` so the number in the ring is never something
you have to take on trust.

**Fast logging** — Recipes (built from weighed ingredients, logged by the
serving), saved meals, starred foods, copy any previous day or one meal from
it, and quick-add when you only know the calories.

**Progress** — Weight trend, calories against goal over 7/14/30 days, a
nutrient average table, and a logging streak.

**Settings** — Targets calculated from your height, weight, age, sex and
activity level rather than guessed, with a macro split you choose. Every target
stays hand-editable. Metric or imperial.

## How it works

```
src/
  app/
    page.tsx                    diary — one day at a time
    progress/                   weight, intake history, streak
    foods/                      recipes, saved meals, starred foods
    settings/                   profile, calculated targets, preferences
    api/foods/search/route.ts   proxies USDA search, keeps the key server-side
  components/                   charts, dialogs, and shared UI primitives
  lib/
    types.ts                    the model and the arithmetic over it
    store.ts                    persistence — the only file that touches storage
    nutrition.ts                BMR, TDEE, macro splits, unit conversion
    stats.ts                    streaks, averages, weight smoothing
    usda.ts                     mapping USDA's payload onto our model
    date.ts                     local calendar days as YYYY-MM-DD keys
```

Four ideas hold the rest together:

**Nutrients are stored per 100 g.** Every food, whatever its source, is
normalised to per-100 g values in one flat shape with no optional fields. A
portion is a gram multiplier, and arithmetic over nutrients is a single generic
map rather than nine special cases.

**Entries own a copy of their food.** A log entry stores the food itself rather
than a reference. Editing or deleting a food, recipe or saved meal later must
never rewrite what you already ate. Recipes and saved meals copy their
ingredients for the same reason.

**Storage lives behind one module.** Everything persists to `localStorage`
through `src/lib/store.ts`. Nothing else knows where data is kept, so moving to
a real backend is a change in that one file.

**Missing data is shown as missing.** Days you did not log are skipped in
averages rather than counted as zero, and drawn as a gap rather than an empty
bar. A v1 log migrates forward with its new nutrient fields left at zero,
because those numbers genuinely did not exist when the food was logged.

## Data and privacy

Everything is stored in your own browser. There is no account, no server-side
database, and nothing is uploaded. Clearing site data clears your log, and the
data does not follow you to another device.

## Scripts

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Development server with hot reload  |
| `npm run build`     | Production build                    |
| `npm start`         | Serve the production build          |
| `npm test`          | Unit tests                          |
| `npm run typecheck` | TypeScript, no build                |
| `npm run lint`      | ESLint                              |

Tests cover the parts that fail quietly rather than loudly — the BMR equation
and its intake floor, macro splits, recipe scaling, streak and average windows,
and the corrections applied to USDA payloads. They run on Node's built-in test
runner against the real source, with no extra dependencies.

## Not built yet

- Barcode scanning
- Editing a logged entry's weight in place (delete and re-add for now)
- Syncing between devices
- Micronutrients beyond the nine tracked
