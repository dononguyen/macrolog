import { NextResponse } from "next/server";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { toFoods, type UsdaSearchResponse } from "@/lib/usda";

/**
 * Proxies USDA FoodData Central search.
 *
 * This exists as a server route rather than a fetch from the browser for two
 * reasons: the API key stays out of the client bundle, and the sprawling USDA
 * payload is reduced to the handful of fields the app actually uses.
 *
 * Being a proxy for a credentialed upstream, it is also the one piece of this
 * app a stranger can reach. Everything below assumes the caller is hostile:
 * the query is bounded, the caller is throttled, and the upstream response is
 * neither trusted nor allowed to be unbounded.
 */

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

/** DEMO_KEY works without signup but is rate limited to ~30 requests/hour. */
const DEMO_KEY = "DEMO_KEY";

const isDev = process.env.NODE_ENV === "development";

// A deployed copy running on DEMO_KEY will stop searching within minutes of
// more than one person using it. Say so once, in the build log, rather than
// leaving the owner to diagnose it from users reporting that search is broken.
if (!isDev && !process.env.USDA_API_KEY?.trim()) {
  console.warn(
    "[macrolog] USDA_API_KEY is not set. Food search will fall back to the " +
      "shared DEMO_KEY and be rate limited after roughly 30 requests an hour.",
  );
}

/** Long enough for any real food name; short enough to be a poor payload. */
const MAX_QUERY_LENGTH = 100;

/** Upstream is a fixed host over TLS, but a hung request still ties up a worker. */
const UPSTREAM_TIMEOUT_MS = 8_000;

/** A page of 25 foods is tens of kilobytes; anything at this size is wrong. */
const MAX_RESPONSE_BYTES = 4_000_000;

/**
 * Without this the route is an open, unauthenticated proxy: anyone who finds
 * the deployed URL can spend the owner's USDA quota until searches stop
 * working for real users. Twenty a minute is far above human typing speed even
 * with the client's debounce.
 */
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  const rate = limiter.check(clientKey(request.headers));
  if (!rate.allowed) {
    return jsonError("Too many searches. Try again in a moment.", 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const query = raw.trim();

  if (!query) {
    return NextResponse.json({ foods: [] });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return jsonError("That search is too long.", 400);
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
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // Food macros are static; let Next cache identical searches for a day.
      next: { revalidate: 86_400 },
    });
  } catch {
    return jsonError(
      "Could not reach the USDA food database. Check your connection.",
      502,
    );
  }

  if (response.status === 429) {
    return jsonError(
      // Someone testing a deployed copy cannot act on a note about .env.local,
      // and telling a stranger how the key is configured is free reconnaissance.
      // The actionable version is kept for whoever is running it locally.
      isDev
        ? apiKey === DEMO_KEY
          ? "The shared demo key is rate limited. Add your own USDA_API_KEY to .env.local — see README."
          : "USDA rate limit reached. Try again shortly."
        : "Food search is busy right now. Try again in a moment.",
      429,
    );
  }

  if (response.status === 403) {
    return jsonError(
      isDev
        ? "USDA rejected the API key. Check USDA_API_KEY in .env.local."
        : "Food search is unavailable right now.",
      502,
    );
  }

  if (!response.ok) {
    // Deliberately not echoing the upstream status: it tells a caller probing
    // this endpoint more about the backend than it tells a user.
    return jsonError("USDA search is unavailable right now.", 502);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    return jsonError("USDA returned an unexpectedly large response.", 502);
  }

  let payload: UsdaSearchResponse;
  try {
    const body = await response.text();
    // Length is checked again after reading, since content-length is optional
    // and a chunked response can omit it entirely.
    if (body.length > MAX_RESPONSE_BYTES) {
      return jsonError("USDA returned an unexpectedly large response.", 502);
    }
    payload = JSON.parse(body) as UsdaSearchResponse;
  } catch {
    return jsonError("USDA returned a response we could not read.", 502);
  }

  // toFoods picks out named fields rather than passing the upstream object
  // through, so nothing unexpected in the payload reaches the client.
  return NextResponse.json({ foods: toFoods(payload) });
}
