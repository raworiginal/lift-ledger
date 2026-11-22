# Milestone 2: Last-time comparison and activity heatmap

**Done means that while logging a workout, each exercise shows what the user did last time, and the `/app` home page shows a 52-week heatmap of days with a completed workout.** Build on the Milestone 1 loop; routines stay deferred.

This document is the source of truth for the requirements. Domain terms are defined in `GLOSSARY.md` at the repo root.

## Scope and decisions

- **Last time:** the most recent completed workout containing the exercise, ordered by `workout_date`, then `completed_at`. Drafts are excluded. The workout being viewed is excluded, so a completed workout never compares against itself. Sets from a different unit are shown in their original unit with its label; they are not converted.
- **Last-time delivery:** `GET /api/workouts/:id` includes a `lastTime` value on each exercise group. The editor makes one request, not one per exercise.
- **Heatmap:** the last 52 weeks ending on the client's local date, weeks starting Monday, on the `/app` home page. A day is active if it has at least one completed workout, grouped by `workout_date`. Drafts never count. The cell is binary: a workout or no workout. The client sends its local date; the server does no time zone conversion.
- **Heatmap shading:** two states only. Inactive days use the empty style; active days use the filled style. No intensity levels.
- **Docs:** this file is the milestone document. The junior-facing walkthrough, if one is written, lives alongside it in `docs/plan/`.

## 1. Last-time comparison

**Server**

- Add a helper in `server/utils/workouts.ts` that returns the most recent completed workout for the current user containing a given exercise, excluding a given workout ID. Order by `workout_date` desc, then `completed_at` desc.
- Return that workout's sets in their original order, with the unit label, as `lastTime` on each exercise group in `GET /api/workouts/:id`. Use `null` when no earlier completed workout contains the exercise.
- `POST /api/workouts/:id/exercises` also returns `lastTime` with the group, so a newly added exercise shows its last-time data before any set is logged.
- Scope every query by the authenticated user ID.

**UI**

- Presentational `LastTimeSummary` component: receives sets and unit as props and renders them with the unit label. It never fetches.
- The editor page `app/pages/app/workouts/[id].vue` owns the data and passes it down. The composable `useWorkoutEditor` holds the fetch and status logic.
- Show last time in two places on each exercise group:
  - **Group header:** a short summary (date and set count) that stays visible after sets are logged.
  - **Set-entry area:** the full last-time sets above the weight and rep inputs, so the user sees them while typing.
- Keep both visible on mobile without crowding the set-entry inputs.

## 2. Activity heatmap

**Server**

- Add `GET /api/workouts/activity?today=YYYY-MM-DD`. Validate `today` as a real `YYYY-MM-DD` date and return `400` otherwise.
- Compute the 52-week window ending on `today`, with weeks starting Monday. Return the active `workout_date` values for the user's completed workouts within that window. Drafts are excluded.
- Add a migration with an index on completed workouts by `(user_id, workout_date)`. Generate it with `pnpm db:generate` and review the SQL to confirm it only adds that index.

**Shared logic**

- Put the window math (start date, Monday alignment, and cell list) in `shared/` as pure functions so the server, client, and tests share one implementation.

**UI**

- Presentational `ActivityHeatmap` component: receives the cells and renders each as active or inactive. No API calls.
- The `/app` home page `app/pages/app/index.vue` fetches the data, passes it to the component, and keeps the existing shortcuts.

## 3. Tests

- `tests/*.test.ts`:
  - Window bounds and Monday alignment for several `today` values, including a Sunday and a Monday.
  - Date validation for the `today` parameter.
  - Last-time ordering as a pure function if one is extracted.
- `tests/db/*.test.ts` (requires `TEST_DATABASE_URL`):
  - Last time ignores drafts, other users' workouts, and the excluded workout.
  - Last time breaks same-date ties by `completed_at`.
  - Last time returns `null` when no earlier completed workout exists.
  - Heatmap returns only the user's completed workouts inside the window.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, and `pnpm build`.

## 4. Phone acceptance test

- Log a workout with an exercise you did last week. Confirm the last-time sets appear with the correct unit.
- Log a workout in a different unit for the same exercise. Confirm the previous sets keep their original unit and are not converted.
- Open a completed workout and confirm it doesn't show its own sets as "last time."
- Finish a workout and return to `/app`. Confirm today's cell is filled, and that a draft does not fill its date.
- Confirm the heatmap shows 52 weeks and starts on a Monday.
