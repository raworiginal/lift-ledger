# Milestone 1: Log, resume, and review a workout

**Done means you can log a real workout on your phone, refresh mid-session without losing saved sets, finish it, and reopen it from history.** Build that full loop before adding last-time comparisons, routines, or the heatmap.

## 1. Add workout storage and validation

Create `server/db/schema/workouts.ts` with three tables:

| Table | Fields and rules |
| --- | --- |
| `workouts` | UUID, Better Auth user ID, workout date, focus, unit (`kg` or `lb`), `createdAt`, `updatedAt`, and nullable `completedAt`. A null `completedAt` means draft. Add a partial unique index on user ID for drafts so even two simultaneous starts can’t create two drafts. |
| `workout_exercises` | Workout ID, catalog exercise ID, and display position. Use `(workoutId, exerciseId)` as the primary key. This lets an exercise selection survive a refresh even before the first set is entered. |
| `workout_sets` | UUID, workout ID, catalog exercise ID, workout-wide position, decimal weight, and integer reps. Reference the selected exercise through `(workoutId, exerciseId)` and make `(workoutId, position)` unique. |

Cascade deletes from workouts to their exercises and sets. Don’t cascade catalog deletions into workout history. Use the existing catalog’s text IDs rather than creating a second exercise catalog.

Set the following rules in server validation and enforce the core invariants in the database:

- **Date:** Store a PostgreSQL `date` and send `YYYY-MM-DD` across the API. Default to the device’s local date, not the UTC date, and allow backdating.
- **Focus:** Require a selection when starting: Full Body, Upper Body, Lower Body, Push, Pull, Legs, Chest, Back, or Other.
- **Weight and reps:** Use a fixed-precision decimal for weight, allow `0` and up to two decimal places, and require positive whole-number reps. An empty weight field is invalid, not zero.
- **Unit:** Choose it when starting. Don’t let a user switch units while sets exist; changing the label would silently reinterpret every weight.
- **Order:** Assign the next position on the server. Don’t renumber stored positions after a delete. In the UI, show contiguous set numbers *within each exercise*.

Generate and apply the migration locally with `pnpm db:generate` and `pnpm db:migrate`. Review the generated SQL to make sure it only adds the intended workout schema.

## 2. Build the API before the screens

Put handlers under `server/api/workouts/` and keep shared database operations in `server/utils/workouts.ts`. Use **`workouts`** in code to avoid confusing workout sessions with Better Auth sessions.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/workouts/draft` | Return the current draft summary or `null`. |
| `POST /api/workouts` | Start a draft from date, focus, and unit. If a draft already exists, return it unchanged so the client can resume it. |
| `GET /api/workouts` | Return completed workouts only, newest workout date first, with focus and set count. Use a stable tie-breaker for same-day workouts and a bounded page size. |
| `GET /api/workouts/:id` | Return workout metadata, ordered exercises with catalog names, and ordered sets. |
| `PATCH /api/workouts/:id` | Update date or focus; allow unit changes only before sets exist. |
| `DELETE /api/workouts/:id` | Discard a draft or delete a completed workout. Confirm in the UI. |
| `POST /api/workouts/:id/exercises` | Add a catalog exercise. If it’s already present, return the existing entry so the UI can focus that group. |
| `DELETE /api/workouts/:id/exercises/:exerciseId` | Remove an exercise group only if it has no sets. |
| `POST /api/workouts/:id/sets` | Save a set for a selected exercise. The client supplies a UUID for the submission and reuses it on retry, so a lost response can’t turn one set into two. |
| `PATCH` / `DELETE /api/workouts/:id/sets/:setId` | Correct or remove a set. Don’t allow removal of the last set from a completed workout. |
| `POST /api/workouts/:id/complete` | Finish only if at least one saved set exists. Repeating a successful finish returns the completed workout. |

Follow `server/api/exercises/index.get.ts` for authenticated private responses. Call `requireUserSession(event)` in every handler, derive ownership from the authenticated user, and scope nested lookups by both workout and child ID. Return `404` for missing or unowned records.

**Serialize mutations on the same workout.** In a transaction, lock the owned workout row before allocating positions, checking the set count, or changing completion state. That prevents two requests from assigning the same position or a delete from racing with Finish. For editor mutations, have the client send the status it loaded (`draft` or `completed`); if it changed in another tab, return `409` and reload rather than treating an old draft action as a history correction.

## 3. Build the phone-first logger

Use the existing `/app/**` page protection. Keep fetching and save state in the page or a workout editor composable; keep the exercise picker and set rows focused on rendering and input.

1. **Entry — `app/pages/app/index.vue`:** Keep the existing home and shortcuts. Add **Start Workout** or **Resume Workout**, plus **Workout History**. Start opens a short date, focus, and unit form.
2. **Editor — `app/pages/app/workouts/[id].vue`:** Show metadata at the top, then exercise groups. Reuse `GET /api/exercises` for a searchable picker; there’s no need to bring the full catalog filter UI into the logger.
3. **Set entry:** Use labeled weight and rep inputs with mobile-friendly keyboards. Make **Add Set** prominent. After a successful save, prefill the next entry with that exercise’s just-logged values so repeat sets take one tap. Show saved sets as rows with explicit edit and delete actions.
4. **Save behavior:** Save on **Add Set** or **Save Edit**, not on every keystroke. Show saving, saved, and failed states. Keep entered values on failure, offer Retry, and block Finish while a save is pending. Make it clear that a half-entered row hasn’t been saved.
5. **Finish:** Keep the action easy to reach on mobile. Disable it until there’s a saved set, then switch to the completed workout view when the API confirms success. Put **Discard Draft** separately and ask for confirmation.

## 4. Add history and run the release checks

Add `app/pages/app/workouts/index.vue` with completed workouts listed by date, focus, and set count. Open the same `[id].vue` page in read-only mode for completed workouts, with an explicit **Edit Workout** action for corrections. Refresh the list after edits or deletion.

**Automated checks:** Add validation tests under `tests/*.test.ts`, which the current `pnpm test` script discovers. Verify invalid dates, blank or negative weights, decimal reps, and valid zero weight. Against local PostgreSQL, verify one-draft enforcement, retrying a set submission, finishing an empty draft, and account isolation for both workouts and nested sets. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

**Phone acceptance test:** Start a backdated Push workout. Select two exercises, including one with no sets yet. Log two sets, then refresh and confirm both saved sets and both exercise selections return. Simulate a failed save and retry without duplicating a set. Finish, find the workout in history, reopen it, and correct a rep count. Confirm the history reflects the correction and that **Start Workout** is available again.

For the first coding pass, aim for the smallest usable slice: **start a draft → pick one catalog exercise → save one set → refresh and see it again.** Once that works end to end, add Finish, history, and the remaining edit and delete actions.
