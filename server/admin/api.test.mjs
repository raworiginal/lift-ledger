import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  requireAdmin,
  resetAdminPassword,
  updateAdminUser,
} from "./api.ts";

const actor = { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" };
const target = {
  id: "user-1",
  name: "User",
  email: "user@example.com",
  role: "user",
  banned: false,
  createdAt: new Date("2026-01-01"),
  password: "secret",
};

const setup = ({ sessionUser = actor, users = [actor, target] } = {}) => {
  const calls = [];
  const auth = {
    api: {
      listUsers: async (input) => {
        calls.push(["listUsers", input]);
        const offset = Number(input.query?.offset ?? 0);
        const limit = Number(input.query?.limit ?? users.length);
        return { users: users.slice(offset, offset + limit) };
      },
      getUser: async (input) => {
        calls.push(["getUser", input]);
        return users.find((user) => user.id === input.query.id) ?? null;
      },
      createUser: async (input) => {
        calls.push(["createUser", input]);
        return { user: { ...input.body, id: "created" } };
      },
      adminUpdateUser: async (input) => {
        calls.push(["adminUpdateUser", input]);
        return { ...target, ...input.body.data };
      },
      setRole: async (input) => {
        calls.push(["setRole", input]);
        return { user: { ...target, role: input.body.role } };
      },
      banUser: async (input) => {
        calls.push(["banUser", input]);
        return { user: { ...target, banned: true } };
      },
      unbanUser: async (input) => {
        calls.push(["unbanUser", input]);
        return { user: { ...target, banned: false } };
      },
      removeUser: async (input) => {
        calls.push(["removeUser", input]);
        return { success: true };
      },
      setUserPassword: async (input) => {
        calls.push(["setUserPassword", input]);
        return { success: true };
      },
    },
  };
  const deps = {
    auth,
    getSession: async () => (sessionUser ? { user: sessionUser } : null),
    readBody: async (event) => event.body,
    getUserId: (event) => event.id,
  };
  return { calls, deps };
};

test("rejects guests and non-admin sessions", async () => {
  const guest = setup({ sessionUser: null });
  await assert.rejects(() => requireAdmin({}, guest.deps), { statusCode: 401 });

  const user = setup({ sessionUser: target });
  await assert.rejects(() => requireAdmin({}, user.deps), { statusCode: 403 });
});

test("lists sanitized users", async () => {
  const { deps } = setup();

  const users = await listAdminUsers({}, deps);

  assert.deepEqual(users, [
    { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
    { id: "user-1", name: "User", email: "user@example.com", role: "user", banned: false, createdAt: target.createdAt },
  ]);
});

test("passes the request headers to Better Auth admin APIs", async () => {
  const { deps, calls } = setup();
  const headers = new Headers({ cookie: "better-auth.session_token=session" });

  await listAdminUsers({ headers }, deps);

  assert.equal(calls[0][1].headers, headers);
});

test("delegates create, update, password reset, and delete with policy checks", async () => {
  const { calls, deps } = setup();

  await createAdminUser({ body: { name: "New", email: "new@example.com", password: "password" } }, deps);
  await updateAdminUser({ id: target.id, body: { name: "Renamed", role: "user", banned: true } }, deps);
  await resetAdminPassword({ id: target.id, body: { password: "new-password" } }, deps);
  await deleteAdminUser({ id: target.id }, deps);

  assert.deepEqual(calls.map(([name]) => name), [
    "createUser", "listUsers", "getUser", "adminUpdateUser", "banUser",
    "setUserPassword", "listUsers", "getUser", "removeUser",
  ]);
  assert.equal(calls[0][1].body.role, "user");
  assert.deepEqual(calls[5][1], { body: { userId: target.id, newPassword: "new-password" } });
  assert.deepEqual(calls[8][1], { body: { userId: target.id } });
});

test("rejects self-delete and deleting the last admin", async () => {
  const self = setup({ users: [actor] });
  await assert.rejects(() => deleteAdminUser({ id: actor.id }, self.deps), (error) =>
    error.statusCode === 403 && /themselves/i.test(error.message),
  );

  const last = setup({ users: [{ ...target, role: "admin" }] });
  await assert.rejects(() => deleteAdminUser({ id: target.id }, last.deps), (error) =>
    error.statusCode === 403 && /last admin/i.test(error.message),
  );
});

test("rejects self-demotion and demoting the last admin", async () => {
  const self = setup({ users: [actor] });
  await assert.rejects(() => updateAdminUser({ id: actor.id, body: { role: "user" } }, self.deps), (error) =>
    error.statusCode === 403 && /themselves/i.test(error.message),
  );

  const last = setup({ users: [{ ...target, role: "admin" }] });
  await assert.rejects(() => updateAdminUser({ id: target.id, body: { role: "user" } }, last.deps), (error) =>
    error.statusCode === 403 && /last admin/i.test(error.message),
  );
});

test("validates the complete update before mutating role", async () => {
  const adminTarget = { ...target, role: "admin" };
  const { calls, deps } = setup({ users: [actor, adminTarget] });

  await assert.rejects(
    () => updateAdminUser({ id: adminTarget.id, body: { role: "user", name: "" } }, deps),
    { statusCode: 400 },
  );
  assert.deepEqual(calls.map(([name]) => name), ["listUsers", "getUser"]);
});

test("lists more than one page of users", async () => {
  const users = [actor, ...Array.from({ length: 1000 }, (_, index) => ({
    id: `user-${index}`,
    name: `User ${index}`,
    email: `user-${index}@example.com`,
    role: "user",
  }))];
  const { calls, deps } = setup({ users });

  const result = await listAdminUsers({}, deps);

  assert.equal(result.length, 1001);
  assert.equal(calls.filter(([name]) => name === "listUsers").length, 11);
});

test("does not expose internal auth errors", async () => {
  const { deps } = setup();
  deps.auth.api.createUser = async () => {
    throw new Error("SQLITE_CONSTRAINT: accounts.email is not unique");
  };

  const log = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      () => createAdminUser({ body: { name: "New", email: "new@example.com", password: "password" } }, deps),
      (error) => error.statusCode === 500 && error.message === "Unable to create user" && !error.message.includes("SQLITE"),
    );
  } finally {
    console.error = log;
  }
});

test("rolls back earlier update operations when a later operation fails", async () => {
  const adminTarget = { ...target, role: "user", banned: false };
  const calls = [];
  const { deps } = setup({ users: [actor, adminTarget] });
  deps.auth.api.setRole = async (input) => {
    calls.push(["setRole", input]);
    return { user: { ...adminTarget, role: input.body.role } };
  };
  deps.auth.api.adminUpdateUser = async (input) => {
    calls.push(["adminUpdateUser", input]);
    return { user: { ...adminTarget, ...input.body.data } };
  };
  deps.auth.api.unbanUser = async (input) => {
    calls.push(["unbanUser", input]);
    return { user: adminTarget };
  };
  deps.auth.api.banUser = async () => {
    calls.push(["banUser"]);
    throw new Error("database connection failed");
  };

  const log = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      () => updateAdminUser({ id: adminTarget.id, body: { role: "admin", name: "Renamed", banned: true } }, deps),
      (error) => error.statusCode === 500 && error.message === "Unable to update user",
    );
  } finally {
    console.error = log;
  }
  assert.deepEqual(calls.map(([name]) => name), [
    "setRole", "adminUpdateUser", "banUser", "unbanUser", "adminUpdateUser", "setRole",
  ]);
  assert.deepEqual(calls[3], ["unbanUser", { body: { userId: adminTarget.id } }]);
});

test("serializes concurrent last-admin deletes", async () => {
  const users = [actor, { ...target, role: "admin" }];
  let deleteCount = 0;
  const makeDeps = () => {
    const { deps } = setup({ users });
    deps.auth.api.getUser = async (input) => users.find((user) => user.id === input.query.id) ?? { ...target, role: "admin" };
    deps.auth.api.removeUser = async ({ body }) => {
      deleteCount += 1;
      users.splice(users.findIndex((user) => user.id === body.userId), 1);
      return { success: true };
    };
    return deps;
  };

  const results = await Promise.allSettled([
    deleteAdminUser({ id: target.id }, makeDeps()),
    deleteAdminUser({ id: target.id }, makeDeps()),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.statusCode === 403).length, 1);
  assert.equal(deleteCount, 1);
});
