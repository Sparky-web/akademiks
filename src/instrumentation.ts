import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
      integrations: [
        Sentry.captureConsoleIntegration({ levels: ["error"] }),
      ],
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
