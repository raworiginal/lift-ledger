# Milestone 1: Log, resume, and review a workout

**Done means you can log a real workout on your phone, refresh mid-session without losing saved sets, finish it, and reopen it from history.** Build that full loop before adding last-time comparisons, routines, or the heatmap.

This document is the source of truth for the requirements. A step-by-step walkthrough for junior developers lives in `/home/raworiginal/.opencode/plan/milestone-1-junior-guide.md`. Domain terms are defined in `GLOSSARY.md` at the repo root.

## MVP scope and decisions

- **MVP:** milestone 1, plus last-time comparison and the heatmap dashboard. Routines are deferred.
- **Last time:** the most recent completed workout containing the exercise, ordered by `workout_date`, then `completed_at`. Drafts are excluded. Sets from a different unit are shown in their original unit with its label; they are not converted.
- **Heatmap:** the last 52 weeks ending today, weeks starting Monday, on the `/app` home page. A day is active if it has at least one completed workout, grouped by `workout_date`. Each day is either active or inactive; there are no intensity levels (see milestone 2). The client sends its local date; the server does no time zone conversion.
- **Drafts:** no automatic expiry. Users finish or discard them.
- **History:** pages of 20 with a "Load more" button, using keyset pagination.
- **Users:** multi-user with account isolation. Sign-in uses `email-password` mode for the MVP.
- **Self-hosting:** a Dockerfile builds the Nuxt Node server (Node 22.19 or newer). `docker-compose.yml` runs the app and PostgreSQL 16 with a named volume. TLS is handled by a reverse proxy outside this repo. `pnpm db:migrate` runs before the app container starts.
- **Vercel:** run `pnpm db:migrate` manually before each deploy, using the Neon direct URL in `MIGRATIONS_DATABASE_URL`. Migrations do not run during the build.
- **Open item:** Neon's pooled endpoint uses PgBouncer in transaction mode, which requires postgres-js with `prepare: false`. Confirm NuxtHub's `driver: "postgres-js"` setup allows passing this option before deploying to Vercel.

## 1. Add workout storage and validation

Create `server/db/schema/workouts.ts` with three tables:

| Table               | Fields and rules                                                                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workouts`          | UUID, Better Auth user ID referencing `user(id)` with `ON DELETE CASCADE`, workout date, focus, unit (`kg` or `lb`), `createdAt`, `updatedAt`, and nullable `completedAt`. A null `completedAt` means draft. Add a partial unique index on user ID for drafts so even two simultaneous starts can’t create two drafts. |
| `workout_exercises` | Workout ID, catalog exercise ID, and display position. Use `(workoutId, exerciseId)` as the primary key. This lets an exercise selection survive a refresh even before the first set is entered.                                                                                                                       |
| `workout_sets`      | UUID, workout ID, catalog exercise ID, workout-wide position, decimal weight, and integer reps. Reference the selected exercise through `(workoutId, exerciseId)` and make `(workoutId, position)` unique.                                                                                                             |

Cascade deletes from workouts to their exercises and sets, and from users to their workouts. Don’t cascade catalog deletions into workout history. Use the existing catalog’s text IDs rather than creating a second exercise catalog.

Set the following rules in server validation and enforce the core invariants in the database:

- **Date:** Store a PostgreSQL `date` and send `YYYY-MM-DD` across the API. Default to the device’s local date, not the UTC date, and allow backdating. Future dates are rejected.
- **Focus:** Require a value when starting. Free text, trimmed, up to 50 characters.
- **Weight and reps:** Use `numeric(6,2)` for weight, allowing `0` through `9999.99` with up to two decimal places. Reps are an integer from `1` through `100`. An empty weight field is invalid, not zero.
- **Unit:** Choose it when starting, defaulting to `lb`. Don’t let a user switch units while sets exist; changing the label would silently reinterpret every weight.
- **Order:** Assign the next position on the server. Don’t renumber stored positions after a delete. In the UI, show contiguous set numbers _within each exercise_.

Generate and apply the migration locally with `pnpm db:generate` and `pnpm db:migrate`. Review the generated SQL to make sure it only adds the intended workout schema.

## 2. Build the API before the screens

Put handlers under `server/api/workouts/` and keep shared database operations in `server/utils/workouts.ts`. Use **`workouts`** in code to avoid confusing workout sessions with Better Auth sessions. Put validation rules that both the server and the client need in `shared/validation/workouts.ts`.

| Endpoint                                         | Behavior                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/workouts/draft`                        | Return the current draft summary or `null`.                                                                                                                  |
| `POST /api/workouts`                             | Start a draft from date, focus, and unit. If a draft already exists, return it unchanged so the client can resume it.                                        |
| `GET /api/workouts`                              | Return completed workouts only, newest workout date first, with focus and set count. Use a stable tie-breaker for same-day workouts and a bounded page size. |
| `GET /api/workouts/:id`                          | Return workout metadata, ordered exercises with catalog names, and ordered sets.                                                                             |
| `PATCH /api/workouts/:id`                        | Update date or focus; allow unit changes only before sets exist.                                                                                             |
| `DELETE /api/workouts/:id`                       | Discard a draft or delete a completed workout. Confirm in the UI.                                                                                            |
| `POST /api/workouts/:id/exercises`               | Add a catalog exercise. If it’s already present, return the existing entry so the UI can focus that group.                                                   |
| `DELETE /api/workouts/:id/exercises/:exerciseId` | Remove an exercise group only if it has no sets.                                                                                                             |
| `POST /api/workouts/:id/sets`                    | Save a set for a selected exercise. The client supplies a UUID for the submission and reuses it on retry, so a lost response can’t turn one set into two.    |
| `PATCH` / `DELETE /api/workouts/:id/sets/:setId` | Correct or remove a set. Don’t allow removal of the last set from a completed workout.                                                                       |
| `POST /api/workouts/:id/complete`                | Finish only if at least one saved set exists. Repeating a successful finish returns the completed workout.                                                   |

Follow `server/api/exercises/index.get.ts` for authenticated private responses. Call `requireUserSession(event)` in every handler, derive ownership from the authenticated user, and scope nested lookups by both workout and child ID. Return `404` for missing or unowned records.

**Serialize mutations on the same workout.** In a transaction, lock the owned workout row before allocating positions, checking the set count, or changing completion state. That prevents two requests from assigning the same position or a delete from racing with Finish. For editor mutations, have the client send the status it loaded (`draft` or `completed`); if it changed in another tab, return `409` and reload rather than treating an old draft action as a history correction.

## 3. Build the phone-first logger

Use the existing `/app/**` page protection, which the auth layer enforces through `routeRules`.

Follow the **container/presentational** pattern:

- **Pages are the containers.** Each page calls its composable, owns the data and save state, and passes values down as props. Create a separate container component only when the same wiring is shared across pages, the way `NavBarContainer` is shared by the layout.
- **Composables hold the logic.** `useWorkoutEditor`, `useWorkoutHistory`, and `useCurrentDraft` handle fetching, saving, and status. Pure calculations, such as set numbering, are plain functions.
- **Presentational components only render.** They receive props, emit events, and may keep local UI state such as the text being typed. They never call `$fetch`, `useFetch`, or the API.

1. **Entry — `app/pages/app/index.vue`:** Keep the existing home and shortcuts. Add **Start Workout** or **Resume Workout**, plus **Workout History**. Start opens a modal with a date, focus, and unit form. If a draft exists, show **Resume Workout** instead, which opens the editor directly.
2. **Editor — `app/pages/app/workouts/[id].vue`:** Show metadata at the top, then exercise groups. Reuse `GET /api/exercises` for a searchable picker; there’s no need to bring the full catalog filter UI into the logger. Validate `id` as a UUID before fetching.
3. **Set entry:** Use labeled weight and rep inputs with mobile-friendly keyboards (`inputmode="decimal"` and `inputmode="numeric"`). Make **Add Set** prominent. After a successful save, prefill the next entry with that exercise’s just-logged values so repeat sets take one tap. Show saved sets as rows with explicit edit and delete actions.
4. **Save behavior:** Save on **Add Set** or **Save Edit**, not on every keystroke. Show saving, saved, and failed states. Keep entered values on failure, offer Retry, and block Finish while a save is pending. Make it clear that a half-entered row hasn’t been saved.
5. **Finish:** Keep the action easy to reach on mobile. Disable it until there’s a saved set, then switch to the completed workout view when the API confirms success. Put **Discard Draft** separately and ask for confirmation.

## 4. Add history and run the release checks

Add `app/pages/app/workouts/index.vue` with completed workouts listed by date, focus, and set count. Open the same `[id].vue` page in read-only mode for completed workouts, with an explicit **Edit Workout** action for corrections. Refresh the list after edits or deletion.

**Automated checks:**

- Add validation tests under `tests/*.test.ts`, which the current `pnpm test` script discovers. Verify invalid dates, future dates, blank or negative weights, weights above `9999.99`, decimal reps, reps above `100`, and valid zero weight.
- Add database tests under `tests/db/*.test.ts`, run with a new `pnpm test:db` script (`tsx --test tests/db/*.test.ts`). They require a dedicated `TEST_DATABASE_URL` and refuse to run if it’s missing or its database name doesn’t contain `test`. Verify one-draft enforcement, retrying a set submission, finishing an empty draft, account isolation for both workouts and nested sets, and that deleting a user deletes their workouts.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, and `pnpm build`.

**Phone acceptance test:** Start a backdated Push workout. Select two exercises, including one with no sets yet. Log two sets, then refresh and confirm both saved sets and both exercise selections return. Simulate a failed save and retry without duplicating a set. Finish, find the workout in history, reopen it, and correct a rep count. Confirm the history reflects the correction and that **Start Workout** is available again.

For the first coding pass, aim for the smallest usable slice: **start a draft → pick one catalog exercise → save one set → refresh and see it again.** Once that works end to end, add Finish, history, and the remaining edit and delete actions.
