import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// The browser Supabase client talks directly to the Supabase project URL
// (auth + PostgREST), so connect-src has to allow it explicitly rather
// than relying on 'self'.
const connectSrc = ["'self'", supabaseUrl].filter(Boolean).join(" ");

// script-src needs 'unsafe-inline' because Next.js (Turbopack, App
// Router) emits its own hydration/streaming payload as inline <script>
// tags (self.__next_f.push(...)) that aren't nonce'd in this Next
// version — a nonce-based CSP wired through middleware was tried and
// verified (via a production build) to leave those scripts unnonced,
// which breaks hydration entirely (every button silently dead). This is
// a real, deliberate CSP trade-off, not an oversight: nothing in this
// app interpolates untrusted user data into a <script> tag, so the
// residual inline-script-injection risk is low relative to shipping a
// CSP that actually works.
// Next's dev server (Fast Refresh / React DevTools hooks) uses eval() for
// debugging and won't run at all without 'unsafe-eval'. Production builds
// never call eval(), so this stays out of the CSP that real users get.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = ["'self'", "'unsafe-inline'", isDev && "'unsafe-eval'"]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src ${connectSrc}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
