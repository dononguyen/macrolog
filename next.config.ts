import { createHash } from "node:crypto";
import type { NextConfig } from "next";
import { THEME_SCRIPT } from "./src/lib/theme-script";

/**
 * The one inline script in the app is allowed by hash, so the policy never
 * needs script-src 'unsafe-inline'. Hashing the same constant the layout
 * renders means the two cannot drift apart.
 */
const themeScriptHash = `'sha256-${createHash("sha256")
  .update(THEME_SCRIPT)
  .digest("base64")}'`;

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * style-src keeps 'unsafe-inline' because React writes component styles as
 * style attributes and next/font injects its own <style>; there is no way to
 * hash those. That is a far weaker concession than allowing inline script,
 * which this policy does not.
 *
 * The dev build additionally needs 'unsafe-eval' and inline script for hot
 * reloading, so the strict policy is production-only rather than something
 * developers learn to work around.
 */
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : `script-src 'self' ${themeScriptHash}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // The browser only ever talks to this origin; USDA is called server-side.
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  // Nothing here should ever be framed: the app has destructive actions behind
  // a confirm(), which is exactly what clickjacking targets.
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Food searches are in the query string, so no URL should ever be handed to
  // another origin as a referrer.
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Do not advertise the framework and version to attackers scanning for
  // version-specific exploits.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Search responses are per-user and rate limited; never let a shared
        // cache hold or replay them.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
