import assert from "node:assert/strict";
import test from "node:test";
import { fakeUsers, handlerSignature, migrationNumber, validName } from "./devx.mjs";

test("developer generators reject unsafe names and advance migration numbers", () => {
  assert.equal(validName("audit-api"), true);
  assert.equal(validName("../escape"), false);
  assert.equal(migrationNumber(["000001_init.up.sql", "000012_feature.down.sql"]), "000013");
  assert.equal(
    handlerSignature(
      "type ServerInterface interface {\n\tListUsers(w http.ResponseWriter, r *http.Request, params ListUsersParams)\n}",
      "ListUsers",
    ),
    "w http.ResponseWriter, r *http.Request, params gen.ListUsersParams",
  );
});

test("fake users are deterministic and role-varied", () => {
  const first = fakeUsers(20);
  const second = fakeUsers(20);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((user) => user.role)).size, 4);
  assert.equal(new Set(first.map((user) => user.email)).size, 20);
});
