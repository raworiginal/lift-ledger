# Admin User Management

## Goal

Add an admin-only user-management panel and an idempotent first-run bootstrap
that creates or promotes an administrator from environment variables.

## Scope

The first version supports:

- Listing users with name, email, role, status, and creation date.
- Creating users.
- Editing user details and role.
- Enabling and disabling users.
- Resetting a user's password.
- Deleting users.
- Protecting the current account from self-delete and self-demotion.
- Protecting the last remaining admin from demotion or deletion.

The existing Better Auth `admin()` plugin remains the source of truth for
roles and account state. No separate administrator table is introduced.

## Bootstrap

At server startup, an idempotent bootstrap checks:

- `ADMIN_EMAIL` (required to enable bootstrap)
- `ADMIN_PASSWORD` (required to enable bootstrap)
- `ADMIN_NAME` (optional; defaults to the email)

If either required variable is missing, bootstrap does nothing. If the email
does not exist, it creates a user with the configured name and password and
the admin role. If the email already exists, it ensures the user has the admin
role but does not change the existing password. Re-running bootstrap is safe.

Bootstrap failures must be logged as startup errors and must not silently
create a partially configured account.

## Server API

Add thin Nuxt server routes under `/api/admin/users`. Each route must verify
the current session and admin role on the server, independent of client-side
route guards. Better Auth admin operations should handle user mutations and
password hashing.

The API supports list, create, update, password reset, status/role changes,
and delete. Mutation policy checks run before the Better Auth operation:

- Reject self-delete.
- Reject self-demotion.
- Reject deleting the last admin.
- Reject demoting the last admin.

Return ordinary validation and authorization errors without exposing password
data or internal database details.

## Routes and UI

Add `/admin/users` and protect it with the existing Nuxt auth configuration.
Authenticated non-admin users are redirected to `/app`; guests follow the
existing login redirect.

The page uses the existing Vue/daisyUI conventions and presents a responsive
user table with create and edit dialogs. Destructive actions require a clear
confirmation. Server errors appear inline or in an alert, and successful
mutations provide visible feedback. Dangerous actions are disabled when the
current user or last-admin safeguards apply.

## Testing

Cover:

- Bootstrap creates a configured admin when no matching user exists.
- Bootstrap is idempotent and promotes an existing matching user without
  changing its password.
- Bootstrap skips when required variables are absent.
- Non-admin sessions cannot access admin API routes.
- Self-delete, self-demotion, last-admin deletion, and last-admin demotion
  are rejected.
- The admin page can complete the supported CRUD operations.
- Existing tests continue to pass and the production build succeeds.

## Files and Boundaries

Prefer the existing auth configuration, Better Auth operations, Nuxt server
routes, and Vue page/components. Add only small reusable helpers where the
same authorization or bootstrap logic needs independent tests. Do not add a
new auth library, admin database, or UI framework.
