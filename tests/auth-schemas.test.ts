import assert from "node:assert/strict";
import test from "node:test";
import {
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
} from "../layers/auth/shared/auth/schemas/auth";
import {
  createAdminUserSchema,
  listAdminUserProvidersSchema,
} from "../layers/auth/shared/auth/schemas/admin";

test("registration accepts valid data and trims the name", () => {
  const result = registerSchema.safeParse({
    email: "person@example.com",
    name: "  Ada Lovelace  ",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.name, "Ada Lovelace");
});

test("registration rejects mismatched passwords at the confirmation field", () => {
  const result = registerSchema.safeParse({
    email: "person@example.com",
    name: "Ada",
    password: "correct-horse-battery",
    confirmPassword: "different-password",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0]?.path, ["confirmPassword"]);
  }
});

test("login validates email but leaves password policy to authentication", () => {
  assert.equal(
    loginSchema.safeParse({ email: "person@example.com", password: "x" })
      .success,
    true,
  );
  assert.equal(
    loginSchema.safeParse({ email: "invalid", password: "x" }).success,
    false,
  );
});

test("profile accepts an empty image or a valid URL", () => {
  assert.equal(
    profileSchema.safeParse({ name: "Ada", image: "" }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ name: "Ada", image: "https://example.com/a.png" })
      .success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ name: "Ada", image: "not a URL" }).success,
    false,
  );
});

test("password changes require a matching confirmation and current password", () => {
  const valid = {
    currentPassword: "old-password",
    newPassword: "new-password-123",
    confirmPassword: "new-password-123",
  };

  assert.equal(passwordChangeSchema.safeParse(valid).success, true);
  assert.equal(
    passwordChangeSchema.safeParse({ ...valid, confirmPassword: "mismatch" })
      .success,
    false,
  );
  assert.equal(
    passwordChangeSchema.safeParse({ ...valid, currentPassword: "" }).success,
    false,
  );
});

test("admin user creation defaults the role and validates password confirmation", () => {
  const result = createAdminUserSchema.safeParse({
    name: "Ada",
    email: "person@example.com",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.role, "user");

  assert.equal(
    createAdminUserSchema.safeParse({
      name: "Ada",
      email: "person@example.com",
      password: "correct-horse-battery",
      confirmPassword: "different-password",
    }).success,
    false,
  );
});

test("admin provider listing requires between one and fifty non-empty user IDs", () => {
  assert.equal(
    listAdminUserProvidersSchema.safeParse({ userIds: ["user-1"] }).success,
    true,
  );
  assert.equal(
    listAdminUserProvidersSchema.safeParse({ userIds: [] }).success,
    false,
  );
  assert.equal(
    listAdminUserProvidersSchema.safeParse({ userIds: [" "] }).success,
    false,
  );
  assert.equal(
    listAdminUserProvidersSchema.safeParse({
      userIds: Array.from({ length: 51 }, (_, index) => `user-${index}`),
    }).success,
    false,
  );
});
