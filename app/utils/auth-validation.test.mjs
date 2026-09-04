import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAuthForm } from "./auth-validation.mjs";

test("requires an eight-character password", () => {
  assert.equal(
    validateAuthForm({ mode: "sign-in", identifier: "user", password: "short" }),
    "Password must be at least 8 characters.",
  );
});

test("requires a login identifier", () => {
  assert.equal(
    validateAuthForm({ mode: "sign-in", identifier: "", password: "password123" }),
    "Username or email is required.",
  );
});

test("requires a username when signing up", () => {
  assert.equal(
    validateAuthForm({
      mode: "sign-up",
      username: "",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    }),
    "Username is required.",
  );
});

test("requires matching passwords when signing up", () => {
  assert.equal(
    validateAuthForm({
      mode: "sign-up",
      username: "user",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password456",
    }),
    "Passwords do not match.",
  );
});
