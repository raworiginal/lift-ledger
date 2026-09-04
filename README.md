# Lift Ledger

A minimalist self-hosted application for tracking your weight lifting sessions.

## Setup

Make sure to install dependencies:

```bash
# pnpm
pnpm install
```

### First-Run Admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` to create or promote the admin on startup. `ADMIN_NAME` sets the name for a newly created admin. Existing passwords are preserved, and removing the bootstrap variables disables this behavior on later starts.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# pnpm
pnpm dev
```

## Production

Build the application for production:

```bash
# pnpm
pnpm build
```

Locally preview production build:

```bash
# pnpm
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
