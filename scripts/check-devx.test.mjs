import assert from "node:assert/strict";
import test from "node:test";
import { findProblems } from "./check-devx.mjs";

test("developer experience policy is internally complete", () => {
  assert.deepEqual(findProblems(), []);
});
