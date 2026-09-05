import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAdminUser, assertUserMutationAllowed } from "./policy.ts";

const admin = { id: "admin-1", role: "admin" };
const otherAdmin = { id: "admin-2", role: "admin" };
const user = { id: "user-1", role: "user" };

test("rejects a non-admin actor", () => {
  assert.throws(() => assertAdminUser(user), /admin/i);
  assert.throws(
    () => assertUserMutationAllowed({ actor: user, target: admin, action: "delete", adminCount: 2 }),
    /admin/i,
  );
});

test("rejects an actor deleting themself", () => {
  assert.throws(
    () => assertUserMutationAllowed({ actor: admin, target: admin, action: "delete", adminCount: 2 }),
    /themselves/i,
  );
});

test("rejects an actor demoting themself", () => {
  assert.throws(
    () => assertUserMutationAllowed({ actor: admin, target: admin, action: "demote", adminCount: 2 }),
    /themselves/i,
  );
});

test("rejects deleting the last admin", () => {
  assert.throws(
    () => assertUserMutationAllowed({ actor: admin, target: { id: "last-admin", role: "admin" }, action: "delete", adminCount: 1 }),
    /last admin/i,
  );
});

test("rejects demoting the last admin", () => {
  assert.throws(
    () => assertUserMutationAllowed({ actor: admin, target: { id: "last-admin", role: "admin" }, action: "demote", adminCount: 1 }),
    /last admin/i,
  );
});

test("allows changing another user while another admin remains", () => {
  assert.doesNotThrow(() =>
    assertUserMutationAllowed({ actor: admin, target: otherAdmin, action: "delete", adminCount: 2 }),
  );
  assert.doesNotThrow(() =>
    assertUserMutationAllowed({ actor: admin, target: user, action: "demote", adminCount: 2 }),
  );
});
