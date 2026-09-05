import { NextResponse } from "next/server";
import { toFoods, type UsdaSearchResponse } from "@/lib/usda";

/**
 * Proxies USDA FoodData Central search.
 *
 * This exists as a server route rather than a fetch from the browser for two
 * reasons: the API key stays out of the client bundle, and the sprawling USDA
 * payload is reduced to the handful of fields the app actually uses.
 */

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

/** DEMO_KEY works without signup but is rate limited to ~30 requests/hour. */
const DEMO_KEY = "DEMO_KEY";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ foods: [] });
  }

  const apiKey = process.env.USDA_API_KEY?.trim() || DEMO_KEY;

  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "25");
  // Whole foods first, branded last: a search for "chicken breast" should not
  // open with twelve supermarket ready meals.
  url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Food macros are static; let Next cache identical searches for a day.
      next: { revalidate: 86_400 },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the USDA food database. Check your connection." },
      { status: 502 },
    );
  }

  if (response.status === 429) {
    return NextResponse.json(
      {
        error:
          apiKey === DEMO_KEY
            ? "The shared demo key is rate limited. Add your own USDA_API_KEY to .env.local — see README."
            : "USDA rate limit reached. Try again shortly.",
      },
      { status: 429 },
    );
  }

  if (response.status === 403) {
    return NextResponse.json(
      { error: "USDA rejected the API key. Check USDA_API_KEY in .env.local." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `USDA search failed (${response.status}).` },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as UsdaSearchResponse;
  return NextResponse.json({ foods: toFoods(payload) });
}
