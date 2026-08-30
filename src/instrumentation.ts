import * as Sentry from "@sentry/nextjs";
import { normalizeSentryEvent } from "~/lib/utils/sentry/normalize-event";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
      integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
      beforeSend(event) {
        const text = event.message ?? event.logentry?.message ?? "";
        if (typeof text === "string" && text.includes("%c")) return null;
        return normalizeSentryEvent(event);
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
