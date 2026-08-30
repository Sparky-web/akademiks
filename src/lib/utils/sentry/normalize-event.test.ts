import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeChunkLoadError,
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
