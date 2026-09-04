import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAuthForm } from "./auth-validation.mjs";

test("requires a name when signing up", () => {
  assert.equal(
    validateAuthForm({ mode: "sign-up", name: "", email: "user@example.com", password: "password123" }),
    "Name is required.",
  );
});

test("requires an eight-character password", () => {
  assert.equal(
    validateAuthForm({ mode: "sign-in", name: "", email: "user@example.com", password: "short" }),
    "Password must be at least 8 characters.",
  );
});

test("requires matching passwords when signing up", () => {
  assert.equal(
    validateAuthForm({
      mode: "sign-up",
      name: "User",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password456",
    }),
    "Passwords do not match.",
  );
});
