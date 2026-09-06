import { NextResponse, type NextRequest } from "next/server";

/**
 * Sets the Content-Security-Policy, with a fresh nonce per request.
 *
 * Why a nonce and not a hash: the App Router streams the React payload to the
 * browser as inline `self.__next_f.push(...)` scripts whose contents differ on
 * every render. There is no stable hash to allow, so a policy without a nonce
 * blocks them — and blocking them means React never hydrates and the page
 * renders correctly but responds to nothing.
 *
 * Next reads the nonce back out of this header during server rendering and
 * applies it to its own script tags. Ours is applied by hand in the layout.
 */

const isDev = process.env.NODE_ENV === "development";

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced bootstrap load the rest of the bundle
    // without listing every chunk. Dev additionally needs eval, which React
    // uses to rebuild server stack traces; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Styles keep 'unsafe-inline' rather than a nonce: React writes component
    // styles as style attributes, and a nonce cannot apply to an attribute.
    // Far weaker a concession than allowing inline script, which this does not.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // The browser only ever talks to this origin; USDA is called server-side.
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    // Nothing here should ever be framed: the app has destructive actions
    // behind a confirm(), which is exactly what clickjacking targets.
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // The request copy is what the renderer reads the nonce from; the response
  // copy is what the browser enforces. Both have to carry it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Static assets and the JSON API need no nonce; next.config.ts still
      // gives them the rest of the security headers.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      // Prefetched documents are never executed as-is, and giving them a
      // nonce would cache one request's nonce for a later request.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
