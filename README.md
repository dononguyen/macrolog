# macrolog

A calorie and macro tracker. Log what you eat against a daily calorie,
protein, carb and fat target.

Built with Next.js (App Router), TypeScript and Tailwind. Food data comes from
the USDA FoodData Central database.

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

The key is only ever read on the server, in the route below, so it never
reaches the browser.

## How it works

```
src/
  app/
    page.tsx                    the whole UI: one day at a time
    api/foods/search/route.ts   proxies USDA search, keeps the key server-side
  components/                   summary ring, meal lists, add/goals dialogs
  lib/
    types.ts                    Food, Entry, Macros, and the maths over them
    store.ts                    persistence — the only file that touches storage
    usda.ts                     mapping USDA's payload onto our model
    date.ts                     local calendar days as YYYY-MM-DD keys
```

Three ideas hold the rest together:

**Macros are stored per 100 g.** Every food, whatever its source, is normalised
to per-100 g values. A portion is then just a gram multiplier, so every total
in the app is one scale-and-sum with no unit handling at the call site.

**Entries own a copy of their food.** A log entry stores the food itself rather
than a reference to it. Editing or deleting a food later must never rewrite
what you already ate.

**Storage lives behind one module.** Everything persists to `localStorage`
through `src/lib/store.ts`. Nothing else in the app knows where data is kept,
so moving to a real backend is a change in that one file.

## Data and privacy

Everything is stored in your own browser. There is no account, no server-side
database, and nothing is uploaded. Clearing site data clears your log, and the
data does not follow you to another device or browser.

## Scripts

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Development server with hot reload     |
| `npm run build` | Production build                       |
| `npm start`     | Serve the production build             |
| `npm run lint`  | ESLint                                 |

Run `npx tsc --noEmit` for a typecheck without building.

## Not built yet

- Barcode scanning
- Weight tracking and history charts
- Saved meals and recipes
- Copying a previous day's log
