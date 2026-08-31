import assert from "node:assert/strict";
import test from "node:test";

import { createRequestThrottle } from "./request-throttle";

test("starts concurrent requests no faster than the configured interval", async () => {
  let now = 0;
  const delays: number[] = [];
  const throttle = createRequestThrottle(
    1000,
    () => now,
    async (delayMs) => {
      delays.push(delayMs);
      now += delayMs;
    },
  );

  await Promise.all([throttle(), throttle(), throttle()]);

  assert.deepEqual(delays, [1000, 1000]);
  assert.equal(now, 2000);
});
