import * as Sentry from "@sentry/nextjs";

// Server/edge error monitoring. Completely inert until SENTRY_DSN is set in the
// environment (add it in Vercel to switch it on). No DSN → nothing initialises.
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

// Lets Next report server-side (including server-action) errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
