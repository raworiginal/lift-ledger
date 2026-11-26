# Lift Ledger

A Nuxt 4 Web app for tracking weight lifting sessions. Users can record weight lifting sessions with exercises, weights, reps, and sets. A user can create resuable routines.

## Tech Stack

- Nuxt4
- NuxtUI
- Better-Auth
- NuxtHub
- PostgreSQL

## Setup project

1. Create a project from this repository using GitHub's **Use this template** flow, or clone it.
2. Install dependencies and configure the local environment:

   ```sh
   pnpm install
   cp .env.example .env
   ```

3. Set a strong `NUXT_APP_SECRET` (at least 32 characters) and choose the authentication mode in `.env` (see [Authentication mode](#authentication-mode)). `NUXT_BETTER_AUTH_SECRET` can be used when you want a dedicated Better Auth secret.
4. Start PostgreSQL and prepare the database:

   ```sh
   docker compose up -d db
   ```

   In the default `email-password` mode, run `pnpm auth:setup` to apply pending migrations and create the initial admin. For `social-only` setup, follow the separate steps below.
5. Start the app:

   ```sh
   pnpm dev
   ```

   Visit `http://localhost:3000`, sign in at `/login`, and visit `/admin`.

## Configuration

The app uses PostgreSQL through NuxtHub. Set `DATABASE_URL` and `NUXT_APP_SECRET` in the environment. Set `NUXT_PUBLIC_SITE_URL` to the canonical production URL. Social sign-in is optional in the default email/password mode; set both variables for a provider to enable it:

```dotenv
NUXT_GOOGLE_CLIENT_ID=...
NUXT_GOOGLE_CLIENT_SECRET=...
NUXT_GITHUB_CLIENT_ID=...
NUXT_GITHUB_CLIENT_SECRET=...
```

Register the matching callback URLs with each OAuth provider:

- `https://your-domain/api/auth/callback/google`
- `https://your-domain/api/auth/callback/github`

### Authentication mode

`NUXT_PUBLIC_AUTH_MODE` accepts `email-password` (the default, preserving the original behavior) or `social-only`. In `social-only` mode, Better Auth disables email/password authentication on the server, the login and registration pages only offer configured OAuth providers, and at least one provider must be configured. OAuth can be used for both registration and sign-in. No email sender or email-based password reset/account recovery flow is configured in either mode.

For social-only initial admin setup, set `ADMIN_NAME` and `ADMIN_EMAIL`, configure a provider, then:

1. Run `pnpm db:migrate` to apply the schema migrations.
2. Start the app and sign in with the OAuth account whose verified email matches `ADMIN_EMAIL`.
3. Stop the app and rerun `pnpm auth:setup`. The script promotes only an existing user with a verified email and an account from a configured social provider; it does not ask for or create a password. It refuses to promote unverified or non-OAuth accounts.

`ADMIN_PASSWORD` is required only in `email-password` mode. Better Auth rate limits are stored in PostgreSQL so counters are shared across app instances; the rate-limit table is included in the generated Better Auth schema and created by the normal migration step.

The custom `/api/admin/**` endpoints are limited to 20 requests per authenticated admin per minute, and `/api/account/**` endpoints to 30 requests per authenticated user per minute. Each group shares one counter across its routes and application instances; the app uses its own PostgreSQL table and stores a hash of the user ID, not a session token. These limits do not apply to public social-provider discovery or Better Auth's `/api/auth/**` endpoints.

### Netlify or Vercel with Neon

Deploy with the standard Node/serverless runtime (Node 22.19+), not an Edge runtime. Set `DATABASE_URL` to Neon’s pooled connection string for application traffic. For migrations, set `MIGRATIONS_DATABASE_URL` to Neon’s direct (non-pooled) connection string; `pnpm db:migrate` and `pnpm auth:setup` prefer it when present. Both URLs must target the same database. Keep production and preview database credentials isolated.

Run migrations as a release/deploy step, not in the application build. Set `NUXT_PUBLIC_SITE_URL` to the production domain and configure the OAuth callback URLs above. Add secrets in the hosting provider’s environment settings rather than committing them.

### Self-hosting with Docker

`docker-compose.yml` runs two services:

- `db`: PostgreSQL 17 with the named volume `postgres-data`. It listens on `127.0.0.1:5432` only.
- `app`: the Nuxt Node server, listening on port `4545` inside the container. The development Compose file maps it to `localhost:3000`; `compose.prod.yml` maps it to `127.0.0.1:4545`.

When `NUXT_RUN_STARTUP_TASKS=true` (set in both compose files), the app prepares its own database before it serves requests. On every start it:

1. Applies any pending migrations from `server/db/migrations/postgresql`, each in its own transaction, under a Postgres advisory lock so concurrent instances cannot race.
2. Loads the exercise catalog from `data/seed/exercises.json`, skipping the work when the file hasn't changed since the last seed.
3. Creates the admin from `ADMIN_*` if no such account exists. It leaves an existing admin unchanged.

If any step fails, the app logs the error and exits with a non-zero code. Docker's `restart: unless-stopped` then retries it.

TLS is not handled by this repo. For production, put a reverse proxy in front of `127.0.0.1:4545` that terminates HTTPS for your domain.

1. Create `.env` from `.env.example`. Set `POSTGRES_PASSWORD`, a `NUXT_APP_SECRET` of at least 32 characters, `NUXT_PUBLIC_SITE_URL` set to your public `https://` URL, and the `ADMIN_*` values. The `DATABASE_URL` in `.env` is for local use; Compose overrides it to point at the `db` container.
2. Build and start the stack:

   ```sh
   docker compose up -d --build
   ```

3. Check that the app is running with `docker compose ps` and `docker compose logs app`. The logs show the migrations applied and the catalog and admin status.

To upgrade, pull the new code and run `docker compose up -d --build` again. New migrations apply before the app starts serving requests.

### Deploying prebuilt images

GitHub Actions publishes images to Docker Hub (`raworiginal/lift-ledger`) after the Quality workflow passes on `main`, and for every `v*` tag. `compose.prod.yml` pulls those images instead of building on the server, so you only need that file and `.env` on the host:

```sh
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

- `IMAGE_TAG` in `.env` selects the version. It defaults to `latest` (the newest `main` build). Pin a release with `IMAGE_TAG=0.1.0-alpha.1`.
- Cut a release by tagging a commit that has passed Quality: `git tag v0.1.0-alpha.1 && git push origin v0.1.0-alpha.1`.
- The image runs migrations, catalog seeding, and admin setup on startup, so no separate steps are needed. Use `docker compose -f compose.prod.yml logs app` to check them.

To back up the database:

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

Keep `.env` out of source control, and keep backups somewhere other than the host that runs the stack.

## Database commands

```sh
pnpm db:generate  # Generate a migration from the NuxtHub/Better Auth schema
pnpm db:migrate   # Apply pending migrations
pnpm auth:setup   # Prepare Nuxt, apply migrations, and create the initial admin
```

Keep `.env` and production credentials out of source control. Use a secret manager and a managed PostgreSQL database such as Neon for hosted deployments.

## Exercise catalog

The exercise catalog is stored in PostgreSQL and seeded from the version-controlled `data/seed/exercises.json` file. After applying migrations, import or refresh it with:

```sh
pnpm db:seed:exercises
```

The importer validates the dataset and local image assets, then safely upserts exercises and muscles. Exercise images remain in `public/images/exercises/`; the importer converts the dataset's `images/flat/` references to public URL paths. The authenticated catalog endpoints are `GET /api/exercises`, `GET /api/exercises/filters`, and `GET /api/exercises/:id/alternatives`.

The dataset header refers to `LICENSE-DATA.md`; this workspace includes `LICENSE.md`, whose stated scope covers the free-tier exercise data and images. Keep the applicable license with the project and follow its attribution and in-app-use terms. The catalog page displays the required RepDB credit.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
