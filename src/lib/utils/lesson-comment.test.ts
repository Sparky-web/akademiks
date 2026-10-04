import assert from "node:assert/strict";
import test from "node:test";
import {
  LESSON_COMMENT_MAX_LENGTH,
  normalizeLessonComment,
} from "./lesson-comment";

test("trims the comment and keeps line breaks inside", () => {
  assert.equal(
    normalizeLessonComment("  Принести ноутбук\nи конспект  "),
    "Принести ноутбук\nи конспект",
  );
});

test("empty or blank value removes the comment", () => {
  assert.equal(normalizeLessonComment(""), null);
  assert.equal(normalizeLessonComment("  \n "), null);
});

test("rejects too long comment", () => {
  assert.equal(
    normalizeLessonComment("а".repeat(LESSON_COMMENT_MAX_LENGTH)),
    "а".repeat(LESSON_COMMENT_MAX_LENGTH),
  );
  assert.throws(
    () => normalizeLessonComment("а".repeat(LESSON_COMMENT_MAX_LENGTH + 1)),
    /длиннее 500/,
  );
});
