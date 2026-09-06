import assert from "node:assert/strict";
import { test } from "node:test";
import { clientKey, createRateLimiter } from "./rate-limit";

test("allows requests up to the limit and blocks the next one", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });

  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("a", 10).allowed, true);
  assert.equal(limiter.check("a", 20).allowed, true);

  const blocked = limiter.check("a", 30);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test("remaining counts down to zero", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(limiter.check("a", 0).remaining, 1);
  assert.equal(limiter.check("a", 1).remaining, 0);
});

test("the window slides, so an old request stops counting", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

  limiter.check("a", 0);
  limiter.check("a", 500);
  assert.equal(limiter.check("a", 900).allowed, false);

  // The first request has now aged out of the window; one slot frees up.
  assert.equal(limiter.check("a", 1001).allowed, true);
});

test("retry-after reports when the window frees up, never below a second", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
  limiter.check("a", 0);

  const blocked = limiter.check("a", 1_000);
  assert.equal(blocked.allowed, false);
  // 60s window, 1s elapsed => 59s left.
  assert.equal(blocked.retryAfterSeconds, 59);

  const nearlyOver = limiter.check("a", 59_900);
  assert.equal(nearlyOver.retryAfterSeconds, 1);
});

test("one caller being blocked does not affect another", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });

  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("a", 1).allowed, false);
  assert.equal(limiter.check("b", 2).allowed, true);
});

test("tracked keys are bounded, so a flood of addresses cannot exhaust memory", () => {
  const limiter = createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 10 });

  for (let i = 0; i < 200; i++) limiter.check(`ip-${i}`, i);
  assert.ok(limiter.size() <= 10, `held ${limiter.size()} keys`);
});

test("expired keys are swept rather than evicting live ones", () => {
  const limiter = createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 4 });

  for (let i = 0; i < 4; i++) limiter.check(`old-${i}`, 0);
  // Well past the window: every existing key is stale and should be dropped,
  // leaving room for the new caller rather than turning it away.
  assert.equal(limiter.check("fresh", 5_000).allowed, true);
});

test("clientKey reads the original client from X-Forwarded-For", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
  });
  assert.equal(clientKey(headers), "203.0.113.7");
});

test("clientKey falls back to X-Real-IP, then to a constant", () => {
  assert.equal(clientKey(new Headers({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientKey(new Headers()), "unknown");
});

test("clientKey caps length so a huge header cannot become a huge map key", () => {
  const headers = new Headers({ "x-forwarded-for": "a".repeat(5000) });
  assert.ok(clientKey(headers).length <= 64);
});
