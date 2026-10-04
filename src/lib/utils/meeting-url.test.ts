import assert from "node:assert/strict";
import test from "node:test";

import { MEETING_URL_MAX_LENGTH, normalizeMeetingUrl } from "./meeting-url";

test("accepts https links and trims whitespace", () => {
  assert.equal(
    normalizeMeetingUrl("  https://telemost.yandex.ru/j/12345  "),
    "https://telemost.yandex.ru/j/12345",
  );
});

test("empty value removes the link", () => {
  assert.equal(normalizeMeetingUrl("   "), null);
});

test("rejects non-https and dangerous schemes", () => {
  for (const value of [
    "http://zoom.us/j/1",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/a",
  ])
    assert.throws(() => normalizeMeetingUrl(value), value);
});

test("rejects garbage, credentials and too long links", () => {
  assert.throws(() => normalizeMeetingUrl("zoom.us/j/1"));
  assert.throws(() => normalizeMeetingUrl("https://user:pass@zoom.us/j/1"));
  assert.throws(() =>
    normalizeMeetingUrl("https://a.ru/" + "x".repeat(MEETING_URL_MAX_LENGTH)),
  );
});
