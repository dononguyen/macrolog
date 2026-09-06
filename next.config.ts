import type { NextConfig } from "next";

/**
 * The Content-Security-Policy is not set here. It carries a per-request nonce,
 * which a static header cannot, so it lives in src/proxy.ts. Everything below
 * is the same on every response and belongs in config.
 */

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  // Redundant with the policy's frame-ancestors for modern browsers, kept for
  // older ones that only understand this.
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
        source: "/api/:path*",
        headers: [
          // Search responses are per-user and rate limited; never let a shared
          // cache hold or replay them.
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
          // A JSON endpoint should never be able to load anything at all.
          { key: "Content-Security-Policy", value: "default-src 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
