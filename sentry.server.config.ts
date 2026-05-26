/**
 * Sentry server init for Next.js — CROS federation doctrine.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    initialScope: {
      tags: {
        app_slug: "communicare",
        federation_phase: "5",
      },
    },
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
  });
}
