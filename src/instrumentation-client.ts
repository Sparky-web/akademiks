import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  // Ловим и обычные console.error (ошибки, которые логируем, но не throw-аем)
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    /Failed to fetch/i,
  ],
  beforeSend(event) {
    // Отсекаем стилизованные логи dev-логгеров (tRPC loggerLink и т.п.):
    // их текст уникален для каждого вызова и не группируется. Признак — CSS-директива %c.
    const text = event.message ?? event.logentry?.message ?? "";
    if (typeof text === "string" && text.includes("%c")) return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
