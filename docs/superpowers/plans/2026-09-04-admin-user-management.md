# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only user-management panel and an idempotent environment-driven first-run administrator bootstrap.

**Architecture:** Reuse Better Auth's `admin()` plugin as the role and account-state authority. Add small server helpers for admin authorization, bootstrap, and last-admin policy; expose those through Nuxt server routes and consume them from a responsive Vue/daisyUI page.

**Tech Stack:** Nuxt 4, Vue 3, Better Auth 1.7, Nuxt Better Auth, Drizzle/SQLite, Node's built-in test runner, Tailwind CSS 4, daisyUI 5.

**Spec:** `docs/superpowers/specs/2026-09-04-admin-user-management-design.md`

## Global Constraints

- Use `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME` for bootstrap configuration.
- Do not change an existing bootstrap user's password.
- Reject self-delete, self-demotion, last-admin deletion, and last-admin demotion.
- Enforce authorization on the server; client route guards are not sufficient.
- Do not add an auth library, admin table, or UI framework.
- Add the bootstrap variables to both `.env` and `.env.example` without committing real credentials.

---

### Task 1: Add Admin Policy and Bootstrap Helpers

**Files:**
- Create: `server/admin/bootstrap.ts`
- Create: `server/admin/policy.ts`
- Test: `server/admin/bootstrap.test.mjs`
- Test: `server/admin/policy.test.mjs`
- Modify: `server/auth.config.ts` only if the Better Auth admin configuration needs an explicit field/plugin adjustment.

**Interfaces:**
- `bootstrapAdmin(auth, env): Promise<void>` reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, then creates or promotes the configured account.
- `assertAdminUser(user): void` throws an authorization error unless the session user has the admin role.
- `assertUserMutationAllowed({ actor, target, action, adminCount }): void` enforces self and last-admin protections.

- [ ] **Step 1: Write failing bootstrap tests**

  Use dependency-injected fake auth operations and `node:test` to cover missing required variables, creating a new admin, promoting an existing user, preserving an existing password, and safe reruns. Assert that the fake `createUser` operation receives the configured name, email, password, and admin role, while an existing user only receives a role update.

- [ ] **Step 2: Run the focused bootstrap tests**

  Run: `node --test server/admin/bootstrap.test.mjs`

  Expected: FAIL because `server/admin/bootstrap.ts` does not exist or does not yet export the tested function.

- [ ] **Step 3: Implement the minimal bootstrap helper**

  Normalize the configured email only for lookup consistency, skip when either required variable is absent, look up the user through Better Auth, create a missing user with `role: "admin"`, and update only the role for an existing user. Keep password handling inside Better Auth. Throw on failed auth operations so startup cannot silently continue after partial provisioning.

- [ ] **Step 4: Run the bootstrap tests again**

  Run: `node --test server/admin/bootstrap.test.mjs`

  Expected: PASS.

- [ ] **Step 5: Write failing policy tests**

  Cover a non-admin actor, self-delete, self-demotion, deleting the last admin, demoting the last admin, and allowed changes to another user when more than one admin remains.

- [ ] **Step 6: Run the focused policy tests**

  Run: `node --test server/admin/policy.test.mjs`

  Expected: FAIL until the policy helper exists.

- [ ] **Step 7: Implement policy checks**

  Keep the helper independent of H3 and database details. Treat `adminCount` as the count before the requested mutation and reject only the prohibited transitions.

- [ ] **Step 8: Run both helper test files**

  Run: `node --test server/admin/bootstrap.test.mjs server/admin/policy.test.mjs`

  Expected: PASS.

### Task 2: Wire First-Run Bootstrap and Admin API

**Files:**
- Create: `server/plugins/admin-bootstrap.ts`
- Create: `server/api/admin/users/index.get.ts`
- Create: `server/api/admin/users/index.post.ts`
- Create: `server/api/admin/users/[id].patch.ts`
- Create: `server/api/admin/users/[id].delete.ts`
- Create: `server/api/admin/users/[id]/password.put.ts`
- Create: `server/admin/api.ts`
- Test: `server/admin/api.test.mjs`
- Modify: generated/auth migration files if Better Auth's admin fields are missing from the current SQLite schema.

**Interfaces:**
- `requireAdmin(event): Promise<{ actor: AuthUser }>` returns the authenticated admin or throws a safe 401/403 error.
- `listAdminUsers(event): Promise<AdminUser[]>` returns user metadata without passwords or tokens.
- Mutation handlers accept JSON bodies with validated name/email/role/status/password fields and return sanitized users.

- [ ] **Step 1: Verify Better Auth admin operations and schema fields**

  Inspect the installed Better Auth types/runtime for the exact server API methods and confirm that the generated SQLite schema includes role, banned, and ban metadata required by the plugin. If fields are absent, update the auth schema/migration using the repository's existing migration workflow before implementing routes.

- [ ] **Step 2: Write failing authorization/API tests**

  Use the existing Node test style with injected auth/database doubles. Cover non-admin rejection, sanitized list output, create/update/password/delete delegation, and all policy failures from Task 1.

- [ ] **Step 3: Run the focused API tests**

  Run: `node --test server/admin/api.test.mjs`

  Expected: FAIL because the admin API helpers/routes do not exist.

- [ ] **Step 4: Implement shared server authorization and handlers**

  Resolve the current session, reject guests and non-admins, validate request bodies, call Better Auth for password hashing and user mutations, count admins before destructive role changes, apply `assertUserMutationAllowed`, and strip password/session fields from every response. Map validation, not-found, and authorization failures to stable client-safe HTTP errors.

- [ ] **Step 5: Add Nuxt route wrappers**

  Keep route files thin: each imports the corresponding handler and passes the H3 event through. Use the HTTP verbs and paths defined in the spec, with collection GET/POST, item PATCH/DELETE, and item password PUT.

- [ ] **Step 6: Add the startup plugin**

  Register a Nitro server plugin that obtains the configured Better Auth instance and calls `bootstrapAdmin` once during server startup. Read runtime environment values from the server-side runtime config/process environment, never expose `ADMIN_PASSWORD` to the client, and log a clear startup error before rethrowing failures.

- [ ] **Step 7: Run API, schema, and build checks**

  Run: `node --test server/admin/*.test.mjs server/db/schema.test.mjs`

  Expected: PASS, with the admin columns/migration applied if required.

### Task 3: Add Admin Route Protection and Users Page

**Files:**
- Create: `app/pages/admin/users.vue`
- Create: `app/components/admin/UserForm.vue`
- Create: `app/components/admin/UserTable.vue`
- Modify: `nuxt.config.ts`
- Modify: `app/components/NavBar.vue` if an admin navigation link belongs there.

**Interfaces:**
- `UserTable` emits `edit`, `toggle-status`, `reset-password`, and `delete` with the selected sanitized user.
- `UserForm` accepts an optional user and emits a validated create/update payload.

- [ ] **Step 1: Implement route protection**

  Add `/admin/**` auth protection in `nuxt.config.ts` and ensure the page also checks the loaded session role so authenticated non-admins navigate to `/app`. Keep server API authorization authoritative.

- [ ] **Step 2: Build the page shell with daisyUI**

  Add a responsive page heading, user count, table/card layout, loading state, empty state, and alert region. Use existing typography/colors and daisyUI components rather than custom widget code.

- [ ] **Step 3: Add create/edit form behavior**

  Validate required name/email/password fields in the component, omit password on ordinary edits, call the matching API endpoint, refresh the table after success, and display server errors without exposing raw exceptions.

- [ ] **Step 4: Add status, role, password, and delete actions**

  Confirm destructive actions, disable self-delete/self-demotion and last-admin actions based on current row data, call the API endpoints, and refresh the list after each successful mutation.

- [ ] **Step 5: Verify the page manually through the dev server**

  Run: `pnpm dev`

  Verify guest redirect, non-admin redirect, admin list rendering, create/edit flows, password reset, status/role changes, delete confirmation, and visible error/success feedback at desktop and mobile widths.

### Task 4: Environment, Documentation, and Full Verification

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `README.md`
- Test: existing `app/utils/auth-validation.test.mjs`, `server/db/schema.test.mjs`, and new admin tests.

- [ ] **Step 1: Add bootstrap variables safely**

  Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` to `.env.example` with non-secret example values. Add the same keys to local `.env` using local-only values; do not commit real credentials or replace the existing auth secret.

- [ ] **Step 2: Document first-run behavior**

  Add a short setup section to `README.md` explaining that setting both required variables creates/promotes the admin on startup, existing passwords are preserved, and removing the variables disables bootstrap on later starts.

- [ ] **Step 3: Run all tests**

  Run: `node --test app/utils/auth-validation.test.mjs server/db/schema.test.mjs server/admin/*.test.mjs`

  Expected: PASS.

- [ ] **Step 4: Run the production build**

  Run: `pnpm build`

  Expected: PASS with no TypeScript, Nuxt route, or client-bundle errors.

- [ ] **Step 5: Check the final diff**

  Run: `git diff --check && git status --short`

  Expected: no whitespace errors, no generated secrets, and only files related to admin user management changed.
