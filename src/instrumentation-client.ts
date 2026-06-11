import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error"] }),
  ],
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    /Failed to fetch/i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
