import { test } from "node:test";
import assert from "node:assert/strict";
import { bootstrapAdmin } from "./bootstrap.ts";

const env = (overrides = {}) => ({
  ADMIN_EMAIL: " Admin@Example.com ",
  ADMIN_PASSWORD: "secret-password",
  ADMIN_NAME: "Admin Example",
  ...overrides,
});

const fakeAuth = ({ users = [] } = {}) => {
  const calls = { findUserByEmail: [], updateUser: [], createUser: [] };
  const storedUsers = [...users];
  return {
    calls,
    $context: Promise.resolve({
      internalAdapter: {
        findUserByEmail: async (email) => {
          calls.findUserByEmail.push(email);
          const user = storedUsers.find((item) => item.email === email);
          return user ? { user } : null;
        },
        updateUser: async (userId, data) => {
          calls.updateUser.push({ userId, data });
          const user = storedUsers.find((item) => item.id === userId);
          if (user) Object.assign(user, data);
        },
      },
    }),
    api: {
      createUser: async (input) => {
        calls.createUser.push(input);
        storedUsers.push({ id: "new-user", email: input.body.email, role: input.body.role });
        return { user: { id: "new-user" } };
      },
    },
  };
};

test("skips bootstrap when a required variable is missing", async () => {
  const auth = fakeAuth();

  await bootstrapAdmin(auth, env({ ADMIN_PASSWORD: "" }));

  assert.deepEqual(auth.calls, { findUserByEmail: [], updateUser: [], createUser: [] });
});

test("creates the configured email as an admin when it does not exist", async () => {
  const auth = fakeAuth();

  await bootstrapAdmin(auth, env());

  assert.deepEqual(auth.calls.createUser, [
    {
      body: {
        name: "Admin Example",
        email: "admin@example.com",
        password: "secret-password",
        role: "admin",
      },
    },
  ]);
  assert.deepEqual(auth.calls.updateUser, []);
});

test("promotes an existing user without changing its password", async () => {
  const auth = fakeAuth({ users: [{ id: "existing-user", email: "admin@example.com", role: "user" }] });

  await bootstrapAdmin(auth, env());

  assert.deepEqual(auth.calls.createUser, []);
  assert.deepEqual(auth.calls.updateUser, [{ userId: "existing-user", data: { role: "admin" } }]);
});

test("defaults the admin name to the normalized email", async () => {
  const auth = fakeAuth();

  await bootstrapAdmin(auth, env({ ADMIN_NAME: undefined }));

  assert.equal(auth.calls.createUser[0].body.name, "admin@example.com");
});

test("can be rerun without creating a second user", async () => {
  const auth = fakeAuth({ users: [{ id: "existing-user", email: "admin@example.com", role: "admin" }] });

  await bootstrapAdmin(auth, env());
  await bootstrapAdmin(auth, env());

  assert.equal(auth.calls.createUser.length, 0);
  assert.equal(auth.calls.updateUser.length, 0);
});

test("bootstraps through the internal adapter without an admin session", async () => {
  const calls = { findUserByEmail: [], updateUser: [], createUser: [] };
  const auth = {
    $context: Promise.resolve({
      internalAdapter: {
        findUserByEmail: async (email) => {
          calls.findUserByEmail.push(email);
          return null;
        },
        updateUser: async (...input) => calls.updateUser.push(input),
      },
    }),
    api: {
      createUser: async (input) => {
        calls.createUser.push(input);
        return { user: { id: "new-user" } };
      },
    },
  };

  await bootstrapAdmin(auth, env());

  assert.deepEqual(calls.findUserByEmail, ["admin@example.com"]);
  assert.deepEqual(calls.createUser, [
    {
      body: {
        name: "Admin Example",
        email: "admin@example.com",
        password: "secret-password",
        role: "admin",
      },
    },
  ]);
});
