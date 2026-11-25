import assert from "node:assert/strict";
import { test } from "node:test";
import { readAdminConfig } from "../server/utils/admin-bootstrap";

const base = {
  ADMIN_NAME: "Site Administrator",
  ADMIN_EMAIL: "Admin@Example.com",
  ADMIN_PASSWORD: "correct-horse-battery",
};

test("reads the email-password admin config and lowercases the email", () => {
  assert.deepEqual(readAdminConfig({ ...base }), {
    name: "Site Administrator",
    email: "admin@example.com",
    password: "correct-horse-battery",
    authMode: "email-password",
    socialProviderIds: [],
  });
});

test("requires a password of at least 12 characters in email-password mode", () => {
  assert.throws(
    () => readAdminConfig({ ...base, ADMIN_PASSWORD: undefined }),
    /ADMIN_PASSWORD is not set/,
  );
  assert.throws(
    () => readAdminConfig({ ...base, ADMIN_PASSWORD: "short" }),
    /at least 12 characters/,
  );
});

test("social-only mode needs a configured provider and no password", () => {
  assert.throws(
    () =>
      readAdminConfig({
        ...base,
        ADMIN_PASSWORD: undefined,
        NUXT_PUBLIC_AUTH_MODE: "social-only",
      }),
    /requires at least one configured social provider/,
  );

  const config = readAdminConfig({
    ...base,
    ADMIN_PASSWORD: undefined,
    NUXT_PUBLIC_AUTH_MODE: "social-only",
    NUXT_GITHUB_CLIENT_ID: "id",
    NUXT_GITHUB_CLIENT_SECRET: "secret",
  });
  assert.equal(config.authMode, "social-only");
  assert.equal(config.password, undefined);
  assert.deepEqual(config.socialProviderIds, ["github"]);
});

test("a provider needs both its client id and secret", () => {
  assert.throws(
    () => readAdminConfig({ ...base, NUXT_GOOGLE_CLIENT_ID: "id" }),
    /must be configured together/,
  );
});

test("rejects an unknown auth mode", () => {
  assert.throws(
    () => readAdminConfig({ ...base, NUXT_PUBLIC_AUTH_MODE: "magic-link" }),
    /must be either/,
  );
});
