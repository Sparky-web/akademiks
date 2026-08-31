import assert from "node:assert/strict";
import test from "node:test";

import {
  RgsuGroupGuidNotFoundError,
  isRgsuGroupGuidNotFoundError,
} from "./errors";

test("recognizes a typed missing group GUID error", () => {
  assert.equal(
    isRgsuGroupGuidNotFoundError(new RgsuGroupGuidNotFoundError("18249")),
    true,
  );
});

test("recognizes the missing group GUID response text", () => {
  assert.equal(
    isRgsuGroupGuidNotFoundError(
      new Error('{"success":false,"message":"Не удалось найти GUID группы"}'),
    ),
    true,
  );
});

test("does not classify another RGSU error as a missing GUID", () => {
  assert.equal(
    isRgsuGroupGuidNotFoundError(new Error("Возможно вы бот [, ]")),
    false,
  );
});
