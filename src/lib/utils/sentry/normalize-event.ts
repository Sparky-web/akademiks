import type { Event } from "@sentry/nextjs";

const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to load chunk(?:\s+\S+)?(?:\s+from module\s+\d+)?/i;

export const normalizeChunkLoadError = (value: string): string =>
  CHUNK_LOAD_ERROR_PATTERN.test(value)
    ? value.replace(CHUNK_LOAD_ERROR_PATTERN, "Failed to load chunk")
    : value;

export const normalizeSentryEvent = (event: Event): Event => {
  let isChunkLoadError = false;

  const normalize = (value: string | undefined): string | undefined => {
    if (!value || !CHUNK_LOAD_ERROR_PATTERN.test(value)) return value;
    isChunkLoadError = true;
    return normalizeChunkLoadError(value);
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

  return event;
};
