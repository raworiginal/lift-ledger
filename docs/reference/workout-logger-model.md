# Workout logger model reference

Signatures and shapes for Milestone 1 (log, resume, review a workout). Source of requirements: `docs/plan/milestone-1-workout-logger.md`. Terms: `GLOSSARY.md`.

This file describes what to write, not an implementation. Items marked **(exists)** are already in the repo. Everything else is to be created.

## 1. Data shapes

### Database (exists)

`server/db/schema/workouts.ts`

- `workoutUnit` enum: `"kg" | "lb"`
- `workouts`: `id`, `userId`, `workoutDate` (string, `YYYY-MM-DD`), `focus`, `unit`, `createdAt`, `updatedAt`, `completedAt` (null = draft)
- `workoutExercises`: `workoutId`, `exerciseId`, `position`. Primary key `(workoutId, exerciseId)`.
- `workoutSets`: `id` (client-supplied UUID), `workoutId`, `exerciseId`, `position`, `weight` (numeric 6,2), `reps` (integer)

`server/db/schema/exercises.ts` (exists): `exercises` catalog, with `id`, `nameEn`, `nameDe`, `nameEs`, `equipment`, `images`, and related columns.

### Validation (exists)

`shared/validation/workouts.ts`

| Export                              | Input                              | Output                                                                             |
| ----------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| `WORKOUT_FOCUS_MAX_LENGTH`          | constant                           | `50`                                                                               |
| `workoutDateSchema(today: string)`  | `YYYY-MM-DD`                       | rejects non-dates and future dates                                                 |
| `focusSchema`                       | string                             | trimmed, 1 to 50 chars                                                             |
| `unitSchema`                        | string                             | `"kg" \| "lb"`                                                                     |
| `weightInputSchema`                 | string                             | optional leading `-`, up to 2 decimals, `\|x\| <= 9999.99`                         |
| `weightEntrySchema`                 | string                             | same as `weightInputSchema`, but rejects a leading `-` (what the set form accepts) |
| `repsInputSchema`                   | string                             | integer `1` to `100`                                                               |
| `startWorkoutSchema(today: string)` | `{ date, focus, unit }`            | same, validated                                                                    |
| `workoutSetInputSchema`             | `{ weight: string, reps: string }` | `{ weight: number, reps: number }`                                                 |

Use `today` from the client's local date. The server must not derive it from UTC.

### API types (to create)

Put these in `shared/types/workouts.ts` so the client and server share them.

```ts
export type WorkoutStatus = "draft" | "completed";
export type WorkoutUnit = "kg" | "lb";

export interface WorkoutSummary {
  id: string;
  workoutDate: string; // YYYY-MM-DD
  focus: string;
  unit: WorkoutUnit;
  status: WorkoutStatus;
  completedAt: string | null; // ISO timestamp
  setCount: number;
}

export interface CompletedWorkoutPage {
  items: WorkoutSummary[]; // status is always "completed"
  nextCursor: string | null; // opaque; pass back as ?cursor=
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  position: number; // workout-wide, stored
  setNumber: number; // 1-based within the exercise group, derived
  weight: string; // decimal string as Postgres returns it, e.g. "102.50"
  reps: number;
}

export interface WorkoutExerciseGroup {
  exerciseId: string;
  name: string; // catalog name for the user's locale
  assisted: boolean; // true when weights are zero or negative
  position: number;
  sets: WorkoutSet[]; // ordered by position
}

export interface WorkoutDetail extends WorkoutSummary {
  exercises: WorkoutExerciseGroup[]; // ordered by position
}

export interface ExerciseOption {
  id: string;
  name: string; // catalog name for the user's locale
  equipment: string | null;
}

export interface SaveSetInput {
  id: string; // client-generated UUID, reused on retry
  exerciseId: string;
  weight: string; // validated by weightInputSchema
  reps: string; // validated by repsInputSchema
}

export type SaveState = "idle" | "saving" | "saved" | "failed";
```

Notes:

- `weight` is a string on the wire to avoid float drift. Convert with `Number()` only for display.
- Assisted exercises (`isAssistedExercise`, a whole-word match on `assisted` in `nameEn`) store zero or negative weights. Other exercises store zero or positive weights. The server rejects the wrong sign with 422 on save and update. The database check only bounds the range.
- The set form takes assistance as a positive number. `assistanceToStored` negates it before the request, and `storedToEntry` reverses it for prefill and edit.
- `setCount` on `WorkoutSummary` counts sets across all exercises.

## 2. Server functions

File: `server/utils/workouts.ts`. Every function takes `userId` first and scopes every query by it. Handlers in `server/api/workouts/` call `requireUserSession(event)` and pass `session.user.id`.

Errors: throw `createError({ statusCode })` with the codes in the endpoint table. Return `404` for missing or unowned records, never `403`.

```ts
// Reads
export function getDraft(
  db: Db,
  userId: string,
): Promise<WorkoutSummary | null>;

export function listCompletedWorkouts(
  db: Db,
  userId: string,
  opts: { cursor?: string; limit?: number }, // limit defaults to 20, max 50
): Promise<CompletedWorkoutPage>;
// Order: workout_date desc, completed_at desc, id desc (stable tie-breaker).
// Cursor encodes the last row's (workout_date, completed_at, id).

export function getWorkoutDetail(
  db: Db,
  userId: string,
  workoutId: string,
): Promise<WorkoutDetail | null>; // null = 404

// Writes
export function startDraft(
  db: Db,
  userId: string,
  input: { date: string; focus: string; unit: WorkoutUnit },
): Promise<{ workout: WorkoutSummary; created: boolean }>;
// If a draft exists, return it with created: false. Relies on the partial unique index.

export function updateWorkout(
  db: Db,
  userId: string,
  workoutId: string,
  input: {
    date?: string;
    focus?: string;
    unit?: WorkoutUnit;
    expectedStatus: WorkoutStatus;
  },
): Promise<WorkoutSummary>;
// Unit change allowed only if the workout has no sets (409 otherwise).

export function deleteWorkout(
  db: Db,
  userId: string,
  workoutId: string,
  expectedStatus: WorkoutStatus,
): Promise<void>;

export function addExerciseToWorkout(
  db: Db,
  userId: string,
  workoutId: string,
  input: { exerciseId: string; expectedStatus: WorkoutStatus },
): Promise<{ exercise: WorkoutExerciseGroup; created: boolean }>;
// Existing pair returns created: false. Verify exerciseId exists in the catalog.

export function removeExerciseFromWorkout(
  db: Db,
  userId: string,
  workoutId: string,
  input: { exerciseId: string; expectedStatus: WorkoutStatus },
): Promise<void>; // 409 if the group has sets

export function saveSet(
  db: Db,
  userId: string,
  workoutId: string,
  input: SaveSetInput & { expectedStatus: WorkoutStatus },
): Promise<{ set: WorkoutSet; created: boolean }>;
// Same id again returns the existing set with created: false (idempotent retry).
// Position is assigned as max(position) + 1 inside the locked transaction.

export function updateSet(
  db: Db,
  userId: string,
  workoutId: string,
  setId: string,
  input: { weight?: string; reps?: string; expectedStatus: WorkoutStatus },
): Promise<WorkoutSet>;

export function deleteSet(
  db: Db,
  userId: string,
  workoutId: string,
  setId: string,
  expectedStatus: WorkoutStatus,
): Promise<void>; // 409 if deleting the last set of a completed workout

export function completeWorkout(
  db: Db,
  userId: string,
  workoutId: string,
): Promise<WorkoutSummary>;
// Fails if zero sets. If already completed, returns it unchanged.
```

### Locking rule

Every write function runs inside a transaction that first does:

```sql
select ... from workouts where id = $1 and user_id = $2 for update;
```

Do this before allocating positions, counting sets, or changing `completed_at`. Compare the locked row's status with `expectedStatus`. On mismatch, throw `409`.

### Endpoint table

| Method and path                                  | Function                    | Success                         | Errors                                |
| ------------------------------------------------ | --------------------------- | ------------------------------- | ------------------------------------- |
| `GET /api/workouts/draft`                        | `getDraft`                  | `200` `WorkoutSummary \| null`  |                                       |
| `POST /api/workouts`                             | `startDraft`                | `200` (existing) or `201` (new) | `400` validation                      |
| `GET /api/workouts?cursor=`                      | `listCompletedWorkouts`     | `200` `CompletedWorkoutPage`    | `400` bad cursor                      |
| `GET /api/workouts/:id`                          | `getWorkoutDetail`          | `200` `WorkoutDetail`           | `404`                                 |
| `PATCH /api/workouts/:id`                        | `updateWorkout`             | `200`                           | `404`, `409`, `400`                   |
| `DELETE /api/workouts/:id`                       | `deleteWorkout`             | `204`                           | `404`, `409`                          |
| `POST /api/workouts/:id/exercises`               | `addExerciseToWorkout`      | `200` or `201`                  | `404` workout, `400` unknown exercise |
| `DELETE /api/workouts/:id/exercises/:exerciseId` | `removeExerciseFromWorkout` | `204`                           | `404`, `409`                          |
| `POST /api/workouts/:id/sets`                    | `saveSet`                   | `200` or `201`                  | `404`, `409`, `400`                   |
| `PATCH /api/workouts/:id/sets/:setId`            | `updateSet`                 | `200`                           | `404`, `409`, `400`                   |
| `DELETE /api/workouts/:id/sets/:setId`           | `deleteSet`                 | `204`                           | `404`, `409`                          |
| `POST /api/workouts/:id/complete`                | `completeWorkout`           | `200`                           | `404`, `400` no sets                  |

Editor mutations (`PATCH` and `DELETE` on the workout, sets, and exercises, plus `POST .../exercises` and `POST .../sets`) send `expectedStatus` in the JSON body. `POST /api/workouts` and `POST .../complete` do not, because both are safe to repeat. A `409` on any editor mutation means the status changed elsewhere.

## 3. Pure helpers

File: `app/utils/workout-sets.ts` (client) and reused on the server where needed. No I/O.

```ts
export function numberSetsWithinExercise(
  sets: WorkoutSet[],
): Array<WorkoutSet & { setNumber: number }>;
// Sort by position, then number 1..n per exercise group.
// Input is already grouped by exercise; numbering restarts per exercise.

export function nextPrefill(
  lastSaved: Pick<WorkoutSet, "weight" | "reps"> | null,
): { weight: string; reps: string };
// Empty strings when lastSaved is null.

export function canFinish(
  detail: Pick<WorkoutDetail, "status" | "exercises">,
): boolean;
// True when status is "draft" and at least one group has sets.

export function lastTimeFor(
  completed: Array<{
    workoutDate: string;
    completedAt: string;
    exercises: WorkoutExerciseGroup[];
  }>,
  exerciseId: string,
): WorkoutExerciseGroup | null;
// Ignores drafts. Orders by workoutDate, then completedAt. Returns the first match.
// Milestone 1 does not need this, but the MVP's last-time view does.
```

## 4. Composables

Directory: `app/composables/workouts/`. Composables fetch, save, and track status. They never render.

```ts
// useCurrentDraft.ts
export function useCurrentDraft(): {
  draft: Ref<WorkoutSummary | null>;
  status: Ref<"idle" | "pending" | "success" | "error">;
  refresh: () => Promise<void>;
  start: (input: {
    date: string;
    focus: string;
    unit: WorkoutUnit;
  }) => Promise<WorkoutSummary>;
};

// useWorkoutHistory.ts
export function useWorkoutHistory(): {
  items: ComputedRef<WorkoutSummary[]>;
  hasMore: ComputedRef<boolean>;
  status: Ref<"idle" | "pending" | "success" | "error">;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>; // resets to first page
};

// useWorkoutEditor.ts
export function useWorkoutEditor(workoutId: MaybeRefOrGetter<string>): {
  detail: Ref<WorkoutDetail | null>;
  status: Ref<"idle" | "pending" | "success" | "error">;
  setState: Ref<SaveState>; // for the most recent set save
  selectedExerciseId: Ref<string | null>;
  refresh: () => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (exerciseId: string) => Promise<void>;
  saveSet: (input: Omit<SaveSetInput, "id">) => Promise<void>; // generates UUID, reuses it on retry
  retrySave: () => Promise<void>;
  updateSet: (
    setId: string,
    input: { weight?: string; reps?: string },
  ) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  updateMetadata: (input: {
    date?: string;
    focus?: string;
    unit?: WorkoutUnit;
  }) => Promise<void>;
  complete: () => Promise<void>;
  discard: () => Promise<void>;
};
```

Rules for the editor composable:

- Keep the pending `SaveSetInput` (including its UUID) in memory until the save succeeds. `retrySave` resends the same UUID.
- Set `setState` to `"failed"` on error and keep the user's entered values.
- `complete` and `discard` are blocked while `setState === "saving"`.
- On `409`, call `refresh()` and surface a "This workout changed in another tab" message.

## 5. Presentational components

Directory: `app/components/workouts/presentational/`. Props in, events out. No `$fetch`, `useFetch`, or composables.

| Component                | Props                                                                                         | Emits                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `StartWorkoutModal.vue`  | `open: boolean`, `defaultDate: string`, `today: string`, `pending: boolean`, `error?: string` | `submit: [{ date, focus, unit }]`, `close: []`                       |
| `WorkoutHeader.vue`      | `workoutDate`, `focus`, `unit`, `status`, `canEditUnit: boolean`                              | `edit: [patch]`, `finish: []`, `discard: []`                         |
| `ExercisePicker.vue`     | `results: ExerciseOption[]`, `query: string`, `loading: boolean`                              | `search: [query: string]`, `select: [exerciseId: string]`            |
| `ExerciseGroup.vue`      | `name`, `sets: WorkoutSet[]` (already numbered), `selected: boolean`                          | `select: []`, `remove: []`, `editSet: [setId]`, `deleteSet: [setId]` |
| `SetEntryForm.vue`       | `prefill: { weight: string; reps: string }`, `unit`, `state: SaveState`                       | `add: [{ weight, reps }]`, `retry: []`                               |
| `SetRow.vue`             | `set: WorkoutSet & { setNumber }`, `unit`, `editing: boolean`                                 | `edit: []`, `save: [{ weight, reps }]`, `cancel: []`, `delete: []`   |
| `WorkoutHistoryList.vue` | `items: WorkoutSummary[]`, `hasMore: boolean`, `loading: boolean`                             | `loadMore: []`, `open: [id]`                                         |

Keep local UI state only: the text being typed, and whether a row is in edit mode. Labels and `inputmode` attributes live here:

- Weight: `inputmode="decimal"`
- Reps: `inputmode="numeric"`

## 6. Pages

| Page                               | Container responsibilities                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `app/pages/app/index.vue`          | `useCurrentDraft`. Shows Start Workout or Resume Workout, and Workout History.                                                    |
| `app/pages/app/workouts/index.vue` | `useWorkoutHistory`. Renders `WorkoutHistoryList`.                                                                                |
| `app/pages/app/workouts/[id].vue`  | `useWorkoutEditor(id)`. Validates `id` as a UUID before fetching. Read-only when `status === "completed"` unless edit mode is on. |

## 7. Shared decisions to keep in mind

- Drafts have no expiry. Users finish or discard them.
- History pages hold 20 items and use keyset pagination (`workout_date`, `completed_at`, `id`).
- Set numbers are display-only. Stored `position` is never renumbered after a delete.
- The unit cannot change once sets exist.
- Only completed workouts appear in history.
