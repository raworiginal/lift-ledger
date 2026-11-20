# Milestone 1 Guide: Log, Resume, and Review a Workout

This guide walks you through building the workout logger step by step. It's written for a junior developer, so every step explains *why* as well as *what*.

**The goal:** You can log a real workout on your phone, refresh the page mid-session without losing saved sets, finish the workout, and reopen it from history.

Build the full loop before adding anything extra (last-time comparisons, routines, the heatmap).

---

## 0. Before you start

### Words you'll see

| Word | Meaning in this project |
| --- | --- |
| **Workout draft** | A workout you started but haven't finished. Stored as a workout with `completedAt = null`. |
| **Completed workout** | A finished workout. Shows up in history. |
| **Catalog** | The exercise list already in the database (`exercises` table). We reuse it; we don't create a second list. |
| **Exercise group** | One exercise inside a workout, plus its sets. |
| **Container** | A component that gets the data and does the work (fetching, saving). It passes data down to presentational components. |
| **Presentational component** | A component that only receives props and emits events. It never calls the API itself. |
| **Composable** | A `use...` function that holds reusable stateful logic. Containers call composables. |

### The architecture rule

Every feature in this milestone follows the **container/presentational** pattern:

```
Page (container)  ← calls composables, owns the data and save logic
 └── Presentational components  ← receive props, emit events, render UI
```

In this milestone, **each page is its own container.** You only create a separate container component when the same wiring is needed in more than one place, the way `NavBarContainer` is shared by the app's layout. Until that happens, keep the wiring in the page.

Three rules keep it clean:

1. **Presentational components never call `$fetch`, `useFetch`, or a composable that fetches data.** They receive everything through `defineProps` and tell the parent what happened through `defineEmits`.
2. **Pages hold the data and the save logic.** They pass values down and handle events coming up.
3. **Keep the logic in composables.** The page stays short because the composable does the heavy lifting. This is what the existing `layers/auth` code does with its `containers/` and `presentational/` folders.

Presentational components *may* hold local UI state, such as the text the user is typing before they press Add Set. That isn't server data, so it belongs with the component that displays it.

### Folder layout you'll create

```
app/
  components/workouts/
    presentational/
      StartWorkoutModal.vue
      WorkoutHeader.vue
      WorkoutExerciseGroup.vue
      SetRow.vue
      SetEntryForm.vue
      ExercisePicker.vue
      WorkoutHistoryList.vue
  composables/workouts/
    useWorkoutEditor.ts               # editor state and API calls
    useWorkoutHistory.ts              # history list state
    useCurrentDraft.ts                # home page draft lookup
  pages/app/
    index.vue                         # existing home page (container for Start/Resume)
    workouts/
      index.vue                       # history page (container)
      [id].vue                        # editor / read-only view (container)
server/
  api/workouts/                       # route handlers
  db/schema/workouts.ts               # tables
  utils/workouts.ts                   # shared database operations
shared/
  validation/workouts.ts              # rules used by both server and client
tests/
  workouts-validation.test.ts
tests/db/
  workouts-api.test.ts                # database tests (see step 9)
```

There's no `containers/` folder in this milestone. The pages are the containers.

---

## 1. Create the database tables

**Why first?** The API and the screens both depend on the shape of the data. Get the schema right before anything else.

Create `server/db/schema/workouts.ts` with three tables.

### `workouts`

| Column | Rules |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | References the Better Auth `user` table with **`ON DELETE CASCADE`**. Deleting an account deletes its workouts. |
| `workout_date` | PostgreSQL `date`. Drizzle: `date("workout_date", { mode: "string" })` so the API sends `YYYY-MM-DD`. |
| `focus` | Free text. Trimmed, required, and limited to 50 characters. |
| `unit` | `kg` or `lb`. |
| `created_at`, `updated_at` | Timestamps |
| `completed_at` | Nullable. `null` means draft. |

Add a **partial unique index** so a user can have only one draft:

```ts
uniqueIndex("workouts_one_draft_per_user")
  .on(table.userId)
  .where(sql`completed_at is null`);
```

Find the existing user table with `grep -rn 'pgTable("user"' layers server`. Import it; don't re-create it.

### `workout_exercises`

| Column | Rules |
| --- | --- |
| `workout_id` | References `workouts.id` with `ON DELETE CASCADE` |
| `exercise_id` | References `exercises.id` with `ON DELETE RESTRICT`. The catalog can't be deleted out from under history. |
| `position` | Display order |

Primary key: `(workout_id, exercise_id)`. This means an exercise group exists even before its first set, so a selection survives a refresh.

### `workout_sets`

| Column | Rules |
| --- | --- |
| `id` | UUID primary key. The client supplies it (see step 3). |
| `workout_id` | References `workouts.id` with `ON DELETE CASCADE` |
| `exercise_id` | Part of a **composite foreign key** `(workout_id, exercise_id)` pointing at `workout_exercises`, with `ON DELETE RESTRICT`. A group with sets can't be removed. |
| `position` | Workout-wide order. Unique together with `workout_id`. |
| `weight` | `numeric(6, 2)`, `CHECK (weight >= 0)`. Maximum is **9999.99**. |
| `reps` | `integer`, `CHECK (reps > 0 AND reps <= 100)` |

### Checks before you migrate

1. Run `pnpm db:generate`.
2. Open the generated SQL in `server/db/migrations/postgresql/`.
3. Confirm it **only** adds the workout tables and indexes. If it changes anything else, stop and ask.
4. Confirm the partial index includes `WHERE completed_at IS NULL` and the foreign keys have the right `ON DELETE` behavior.
5. Run `pnpm db:migrate`.

---

## 2. Write the shared validation rules

**Why?** The server must reject bad input, and the form must show the same errors before the request is sent. Writing the rules once in `shared/validation/workouts.ts` keeps them in sync.

Start with a pure function and a test. This is the best first task for a new contributor because it has no database and no UI.

Rules to implement:

- **Date:** a `YYYY-MM-DD` string that's a real calendar date. Backdating is allowed. Future dates are rejected.
- **Focus:** a trimmed, non-empty string up to 50 characters.
- **Unit:** `kg` or `lb`. Default for the start form is `lb`.
- **Weight:** the input is a *string*. Empty is **invalid** (not zero). Must be a number from `0` to `9999.99` with at most two decimal places.
- **Reps:** the input is a *string*. Must be a whole number from `1` to `100`.

Keep weight and reps as strings in the form. Parse them only when you submit. This is how you can tell "left empty" apart from "0."

### Tests (in `tests/workouts-validation.test.ts`)

Cover at least:

- Invalid dates such as `2026-02-30` and `not-a-date`
- A future date (invalid) and today's date (valid)
- Blank weight, negative weight, and `"0"` (valid)
- Weight with three decimals (invalid), `9999.99` (valid), and `10000` (invalid)
- Reps `"1.5"` (invalid), `"0"` (invalid), `"12"` (valid), `"100"` (valid), `"101"` (invalid)

Run `pnpm test`.

---

## 3. Build the API before the screens

**Why?** You can test the API with a request tool before any UI exists. This avoids debugging the UI and the API at the same time.

Put the route handlers in `server/api/workouts/` and shared database code in `server/utils/workouts.ts`. Name the concept `workouts` in code, not `sessions`. Better Auth already uses "session" for logins.

### Endpoints

| Endpoint | Behavior |
| --- | --- |
| `GET /api/workouts/draft` | Returns the current draft summary, or `null`. |
| `POST /api/workouts` | Starts a draft from date, focus, and unit. If a draft exists, returns it unchanged. |
| `GET /api/workouts` | Completed workouts only. Newest first. Order by `workout_date DESC, completed_at DESC, id DESC`. Use keyset pagination and clamp `limit` (for example, 1–50). |
| `GET /api/workouts/:id` | Metadata, ordered exercises with catalog names, ordered sets. |
| `PATCH /api/workouts/:id` | Change date or focus. Change unit only when there are no sets. |
| `DELETE /api/workouts/:id` | Discard a draft or delete a completed workout. |
| `POST /api/workouts/:id/exercises` | Add a catalog exercise. If it's already there, return the existing entry. |
| `DELETE /api/workouts/:id/exercises/:exerciseId` | Remove a group only if it has no sets. |
| `POST /api/workouts/:id/sets` | Save a set. The client sends a UUID and reuses it on retry. |
| `PATCH` / `DELETE /api/workouts/:id/sets/:setId` | Correct or remove a set. The last set of a completed workout can't be removed. |
| `POST /api/workouts/:id/complete` | Finish. Requires at least one set. |

### Every handler follows the same pattern

Look at `server/api/exercises/index.get.ts` as the model. Then:

1. Call `await requireUserSession(event)` first.
2. Take the owner's ID from the session. Never take it from the request.
3. Scope every lookup by the owner **and** the parent ID. A set is looked up by workout *and* set ID.
4. Return `404` for records that are missing or belong to someone else. Don't reveal that they exist.
5. Validate input with the shared schemas. Return `400` on bad input.

### Rules that prevent data bugs

**Serialize changes to the same workout.** Inside a transaction, lock the workout row (`SELECT ... FOR UPDATE`) before you:
- assign a new set position
- check whether a group has sets
- change the unit
- finish the workout

Without the lock, two requests can get the same position, or a delete can race with Finish.

**Stale-status checks.** The client sends the status it last loaded, as `expectedStatus` (`draft` or `completed`), in the body for POST and PATCH and in a query parameter for DELETE. If the status has changed in another tab, return `409`. The UI then reloads. Don't treat an old draft action as a correction to history.

**Finish is the one exception.** If the workout is already completed and the client sends `expectedStatus: draft`, return the completed workout with `200`. Finish is safe to repeat.

**Set retries.** When `POST /api/workouts/:id/sets` gets a UUID that already exists:
- If it belongs to this workout, return the existing set. A retry after a lost response must not create a second set.
- If it belongs to someone else or another workout, return `404` or `409`. Don't reveal its contents.

Use `INSERT ... ON CONFLICT (id) DO NOTHING`, then read the row back, scoped to the workout.

**Starting twice.** If `POST /api/workouts` finds an existing draft, return it. The UI should check `GET /api/workouts/draft` first and show **Resume** instead of the start form, so the user never submits a form that gets silently ignored. The POST behavior is a safety net.

### How to test each endpoint

Test as you go. Use a request tool or a short test file. Confirm:
- A request with no session returns `401`.
- User A can't read or change user B's workout, its exercises, or its sets.

---

## 4. Build the presentational components

**Why now?** Presentational components have no API calls, so you can build them with fake data and check the layout before connecting them.

For each component:
1. Write `defineProps` with TypeScript types.
2. Write `defineEmits` for every action (for example, `save`, `edit`, `delete`).
3. Use Nuxt UI components (`UModal`, `UForm`, `UFormField`, `UInput`, `UButton`, `UAlert`, `UBadge`). Use semantic colors such as `text-default`, `text-muted`, and `bg-elevated`. Don't use raw palette colors like `text-gray-500`.

Build these in order:

1. **`SetRow.vue`**: shows one saved set (weight, reps, edit, delete). Its props are the set and a `disabled` flag. It emits `edit` and `delete`.
2. **`SetEntryForm.vue`**: the weight and reps inputs and an **Add Set** button. Use `type="text"` with `inputmode="decimal"` for weight and `inputmode="numeric"` for reps. Its props are the exercise name, the prefill values, and a save state. It emits `add`. It keeps the typed text locally.
3. **`WorkoutExerciseGroup.vue`**: one exercise name, its `SetRow`s with contiguous per-exercise numbers (1, 2, 3, even if the stored positions have gaps), and a `SetEntryForm`.
4. **`ExercisePicker.vue`**: a `UModal` with a search box and a list. Emits `select` with the exercise ID. It doesn't call the API. The page passes it the results.
5. **`WorkoutHeader.vue`**: date, focus, unit, and the Finish and Discard buttons. Props include `canFinish` and `finishing`. Finish is disabled until a set is saved, and while any save is pending.
6. **`StartWorkoutModal.vue`**: a `UModal` with a `UForm` for date, focus, and unit. Props: `open`, `saving`, `error`. Emits `update:open` and `submit`.
7. **`WorkoutHistoryList.vue`**: a list of completed workouts (date, focus, set count). Emits `open`.

Check each component by temporarily rendering it with sample props in the page. Remove the sample code afterward.

---

## 5. Build the composables

Composables hold the logic. The pages call them.

### `useWorkoutEditor(workoutId)`

Owns:
- Loading the workout with `useFetch`, using a key such as `workout-${id}`.
- A save status for each action: `idle`, `saving`, `saved`, `failed`. Keep the values the user typed on failure.
- The `expectedStatus` the client sends with each request.
- A computed `hasPendingSave` that the page uses to disable Finish.
- Actions: `addExercise`, `addSet`, `updateSet`, `deleteSet`, `removeExercise`, `finish`, `discard`.
- Handling for `409`: reload the workout and show a message.

Use a `computed` for derived values such as the set numbers and each group's last saved set. Keep computed getters free of side effects. Put side effects, such as calling the API, in functions called from events.

### `useWorkoutHistory()`

Loads completed workouts and exposes a `refresh` function. After an edit or delete, the editor calls `refreshNuxtData` with the history key so the list isn't stale.

### `useCurrentDraft()`

Calls `GET /api/workouts/draft` for the home page. Returns the draft or `null`.

### Prefill logic

After a set is saved, the next entry for that exercise should start with the same weight and reps.

- Derive `lastSetFor(exerciseId)` with a `computed`.
- Copy it into the input text only when the set **ID** changes, using a `watch` keyed on that ID. Don't copy it on every render, or you'll overwrite text the user is typing.
- If the last set is deleted, fall back to empty inputs.

---

## 6. Build the pages (containers)

Each page is the container for its screen. It:

1. Reads route params and calls its composable.
2. Passes state down to presentational components as props.
3. Receives events from them and calls composable actions.

Keep the page's own markup to layout only. The components do the rendering.

### Home page: `app/pages/app/index.vue`

This page already has shortcuts. Add the workout entry point here, and keep the start logic on this page:

- Call `useCurrentDraft()`. If a draft exists, the button reads **Resume Workout** and links to `/app/workouts/[id]`. Otherwise it reads **Start Workout** and opens `StartWorkoutModal`.
- Add a **Workout History** link.
- Keep the modal's open state and error on the page.
- On submit, call `POST /api/workouts`. Close the modal and navigate to `/app/workouts/[id]` on success. On failure, pass the error to the modal and keep the form values.
- The default date is built on the client only, from `getFullYear()`, `getMonth()`, and `getDate()`. Don't use `toISOString()`, which gives the UTC date. Set it in `onMounted`, so the server's time zone doesn't cause a mismatch between server and browser output.
- Default unit: `lb`.

If this logic grows past what the page can hold clearly, extract it into a separate container, the way `NavBarContainer` works. Don't do it up front.

### Editor page: `app/pages/app/workouts/[id].vue`

- Validate `id` as a UUID before fetching. If it isn't one, return `404`.
- Call `useWorkoutEditor(id)`.
- Render `WorkoutHeader`, one `WorkoutExerciseGroup` per exercise, and `ExercisePicker`.
- For a completed workout, switch to read-only mode with an explicit **Edit Workout** button.
- Discard asks for confirmation before calling the API.

### History page: `app/pages/app/workouts/index.vue`

- Call `useWorkoutHistory()` and render `WorkoutHistoryList`.

Existing `/app/**` routes are protected by the auth layer's `routeRules`, so you don't need to add auth checks to pages.

---

## 7. First working slice (do this before anything else)

Goal: **start a draft → pick one exercise → save one set → refresh and see it again.**

Steps:
1. Start a draft from the modal on the home page.
2. Open the picker and choose one exercise.
3. Enter a weight and reps, and press **Add Set**.
4. Refresh the page. The set and the exercise are still there.

Once that works end to end, add Finish, history, editing, and deleting.

---

## 8. Finish, discard, history, and edit

- **Finish:** Enabled only when at least one set is saved and no save is pending. On success, switch to the completed read-only view.
- **Discard Draft:** Separate from Finish, behind a confirmation dialog.
- **History:** Lists completed workouts. Opening one shows the read-only view.
- **Edit Workout:** Turns on editing for correction. Editing a completed workout uses `expectedStatus: completed`.
- **Deleting a completed workout:** Confirm first. Then refresh the history list.

---

## 9. Automated checks

- **Validation tests:** `tests/workouts-validation.test.ts`, which you wrote in step 2. These run with `pnpm test`.
- **Database tests:** Live in `tests/db/workouts-api.test.ts` and run with `pnpm test:db`. They check the following against a local PostgreSQL database:
  - Only one draft per user
  - A retried set submission doesn't create a second set
  - Finishing an empty draft is rejected
  - Account isolation: user B can't read or change user A's workouts or sets
  - Deleting a user deletes their workouts (`ON DELETE CASCADE`)

  Set up the script in `package.json` as `"test:db": "tsx --test tests/db/*.test.ts"`. It requires a dedicated `TEST_DATABASE_URL`, and it refuses to run if that variable is missing or its database name doesn't contain `test`. The tests create and delete rows, so they must never point at development data. Each test creates its own users and cleans up after itself.

  `pnpm test` doesn't include these tests, so it still runs without a database. Check how `tests/server/api/admin/admin-request.test.ts` handles the `@nuxthub/db` import before you write these tests. The handlers may need to accept a database handle as a parameter so the tests can pass in their own connection.

Then run, in order:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 10. Phone acceptance test

Do this on a real phone:

1. Start a backdated **Push** workout.
2. Select two exercises, including one with no sets yet.
3. Log two sets.
4. Refresh the page. Confirm both sets and both exercises are still there.
5. Simulate a failed save (for example, turn off Wi-Fi), then retry. Confirm there's no duplicate set.
6. Tap Finish. Find the workout in history and open it.
7. Edit a rep count. Confirm the history shows the change.
8. Confirm **Start Workout** is available again.

---

## Checklist for code reviews

- [ ] Presentational components have no `$fetch`, `useFetch`, or API composables.
- [ ] Pages stay short, and their logic lives in composables.
- [ ] No separate container exists unless the wiring is shared or the page became hard to read.
- [ ] Every handler calls `requireUserSession` and scopes lookups by owner.
- [ ] Weight and reps are strings until submit; empty is never saved as `0`.
- [ ] Mutations on a workout lock its row in a transaction.
- [ ] The migration contains only the intended workout tables.
- [ ] Each computed value is side-effect free.
- [ ] Colors use semantic tokens.
