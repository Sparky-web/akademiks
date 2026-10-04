import assert from "node:assert/strict";
import test from "node:test";
import { isDistantClassroom } from "./distant-classroom";

test("recognizes the Дистант classroom regardless of case and spaces", () => {
  assert.equal(isDistantClassroom("Дистант"), true);
  assert.equal(isDistantClassroom("  дистант "), true);
  assert.equal(isDistantClassroom("ДИСТАНТ"), true);
});

test("other classrooms and empty values are not distant", () => {
  assert.equal(isDistantClassroom("415"), false);
  assert.equal(isDistantClassroom("Дистанционно"), false);
  assert.equal(isDistantClassroom(""), false);
  assert.equal(isDistantClassroom(null), false);
  assert.equal(isDistantClassroom(undefined), false);
});
