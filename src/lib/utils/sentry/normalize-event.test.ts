import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeChunkLoadError,
  normalizePushNotificationError,
  normalizeSentryEvent,
} from "./normalize-event";

test("removes the chunk path and module id", () => {
  assert.equal(
    normalizeChunkLoadError(
      "Error: Failed to load chunk /_next/static/chunks/33db1908c861719d.js from module 115092",
    ),
    "Error: Failed to load chunk",
  );
});

test("normalizes all grouping fields", () => {
  const event = normalizeSentryEvent({
    message:
      "Failed to load chunk /_next/static/chunks/first.js from module 100",
    logentry: {
      message:
        "Failed to load chunk /_next/static/chunks/second.js from module 200",
    },
    exception: {
      values: [
        {
          type: "Error",
          value:
            "Failed to load chunk /_next/static/chunks/third.js from module 300",
        },
      ],
    },
  });

  assert.equal(event.message, "Failed to load chunk");
  assert.equal(event.logentry?.message, "Failed to load chunk");
  assert.equal(event.exception?.values?.[0]?.value, "Failed to load chunk");
  assert.deepEqual(event.fingerprint, ["nextjs-chunk-load-error"]);
});

test("removes the email from a legacy push notification error", () => {
  assert.equal(
    normalizePushNotificationError(
      "Ошибка отправки уведомления пользователю: user@example.com - Не удалось отправить push-уведомления на все подписки",
    ),
    "Ошибка отправки push-уведомления: Не удалось отправить push-уведомления на все подписки",
  );
});

test("groups push notification errors without a Sentry user", () => {
  const event = normalizeSentryEvent({
    message:
      "Ошибка отправки push-уведомления: Не удалось отправить push-уведомления на все подписки",
    user: {
      id: "user-id",
      email: "user@example.com",
    },
  });

  assert.equal(
    event.message,
    "Ошибка отправки push-уведомления: Не удалось отправить push-уведомления на все подписки",
  );
  assert.equal(event.user, undefined);
  assert.deepEqual(event.fingerprint, ["push-notification-send-error"]);
});
