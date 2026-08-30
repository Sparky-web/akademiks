import type { Event } from "@sentry/nextjs";

const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to load chunk(?:\s+\S+)?(?:\s+from module\s+\d+)?/i;
const PUSH_NOTIFICATION_ERROR_PREFIX = "Ошибка отправки push-уведомления";
const LEGACY_PUSH_NOTIFICATION_ERROR_PATTERN =
  /Ошибка отправки уведомления пользователю:\s+\S+\s+-\s*/iu;

export const normalizeChunkLoadError = (value: string): string =>
  CHUNK_LOAD_ERROR_PATTERN.test(value)
    ? value.replace(CHUNK_LOAD_ERROR_PATTERN, "Failed to load chunk")
    : value;

export const normalizePushNotificationError = (value: string): string =>
  LEGACY_PUSH_NOTIFICATION_ERROR_PATTERN.test(value)
    ? value.replace(
        LEGACY_PUSH_NOTIFICATION_ERROR_PATTERN,
        `${PUSH_NOTIFICATION_ERROR_PREFIX}: `,
      )
    : value;

export const normalizeSentryEvent = (event: Event): Event => {
  let isChunkLoadError = false;
  let isPushNotificationError = false;

  const normalize = (value: string | undefined): string | undefined => {
    if (!value) return value;

    let normalizedValue = value;
    if (CHUNK_LOAD_ERROR_PATTERN.test(normalizedValue)) {
      isChunkLoadError = true;
      normalizedValue = normalizeChunkLoadError(normalizedValue);
    }

    normalizedValue = normalizePushNotificationError(normalizedValue);
    if (normalizedValue.includes(PUSH_NOTIFICATION_ERROR_PREFIX)) {
      isPushNotificationError = true;
    }

    return normalizedValue;
  };

  event.message = normalize(event.message);

  if (event.logentry?.message) {
    event.logentry.message = normalize(event.logentry.message) ?? "";
  }

  for (const exception of event.exception?.values ?? []) {
    exception.value = normalize(exception.value);
  }

  if (isChunkLoadError) {
    event.fingerprint = ["nextjs-chunk-load-error"];
  }

  if (isPushNotificationError) {
    event.fingerprint = ["push-notification-send-error"];
    delete event.user;
  }

  return event;
};
