# Milestone 3: Rep-range progression

**Done means the `/app` home page shows a Progression card listing each recently trained exercise with its working weight, a progress bar toward the top of the user's rep range, and a status that says whether to add reps, add weight, or hold. Users set their rep range, main unit, and weight step on `/app/profile`.** Build on the Milestone 1 and 2 loops; routines stay deferred.

This document is the source of truth for the requirements. Domain terms are defined in `GLOSSARY.md` at the repo root.

## Scope and decisions

- **Progression model:** double progression. The user keeps a weight until every set reaches the top of the rep range, then adds weight.
- **Training preferences:** one set per user, applied to every exercise:
  - **Rep range:** `repMin` to `repMax`. Default `8` to `12`.
  - **Main unit:** `kg` or `lb`. Default `lb`.
  - **Weight step:** one value in the main unit. Default `5`.
  - No stored row means the defaults apply. No backfill and no row at sign-up.
- **Preferences location:** a Training section on `/app/profile`. The dashboard card shows the current values and links there.
- **Recently trained:** any exercise in a completed workout within the last 28 days, ending on the client's local `today`. Drafts are excluded. Sort by most recent session, then show at most 8 exercises.
- **Session:** one completed workout containing the exercise. Every logged set counts; users do not log warm-ups.
- **Working weight:** the heaviest weight logged for the exercise in that session.
- **Status:** always computed against the user's current preferences. Changing the range re-judges every exercise immediately. No snapshots.
- **Units:** no conversion, consistent with Milestone 2.
  - History and stall detection use only sessions in the same unit as the latest session.
  - A suggested weight is shown only when the latest session's unit matches the main unit. Otherwise a `ready` exercise shows "Add weight" without a number.
  - Changing the main unit does not convert the stored weight step. The form labels the step with the selected unit.
- **New workouts:** `StartWorkoutModal` defaults to the user's main unit instead of the hard-coded `"lb"`. The user can still change it per workout.
- **Docs:** this file is the milestone document. Add the new terms (rep range, working weight, weight step, main unit, progression status) to `GLOSSARY.md` when implementing.

## Status rules

Evaluate in this order against the latest session and the user's preferences:

| Status     | Rule                                                                                                      | Message                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ready`    | Every set has `reps >= repMax`                                                                            | "Next: 85 lb" or "Add weight"             |
| `below`    | Any set has `reps < repMin`                                                                               | "Below range. Hold or reduce the weight." |
| `stalled`  | The last 3 same-unit sessions share the working weight and total reps did not increase across them        | "No progress in 3 sessions."              |
| `building` | Anything else                                                                                             | "Add reps at this weight."                |

- **Progress:** `totalReps / (setCount × repMax)` for the latest session, capped at `1`.
- **Suggested weight:** working weight plus `weightStep`, only for `ready` sessions in the main unit. Calculate in hundredths as integers to avoid float drift, then return a decimal string.
- **Weight history:** the working weight of each same-unit session in the window, oldest first, for the staircase chart.

## 1. Training preferences

**Database**

- Add `server/db/schema/training-preferences.ts`, in the app schema rather than the auth layer:

  ```ts
  trainingPreferences
    userId      text PK, references user.id, on delete cascade
    repMin      integer      not null default 8
    repMax      integer      not null default 12
    unit        workout_unit not null default 'lb'   // reuse the existing enum
    weightStep  numeric(5,2) not null default 5
    updatedAt   timestamptz  not null default now()
    check: repMin >= 1 and repMin < repMax and repMax <= 100
    check: weightStep > 0
  ```

- Generate the migration with `pnpm db:generate` and review the SQL to confirm it only adds this table and its constraints.

**Shared**

- `shared/progression/preferences.ts`: `DEFAULT_TRAINING_PREFERENCES`.
- `shared/types/workouts.ts`:

  ```ts
  export interface TrainingPreferences {
    repMin: number;
    repMax: number;
    unit: WorkoutUnit;
    weightStep: string; // decimal string, like set weight
  }
  ```

- `shared/validation/progression.ts`: `trainingPreferencesSchema`.
  - `repMin` and `repMax` are integers from `1` to `100`, with `repMin < repMax`.
  - `unit` reuses `unitSchema`.
  - `weightStep` is `0.01` to `100` with up to 2 decimals, following `weightInputSchema`.

**Server**

- `server/utils/preferences.ts`:
  - `getTrainingPreferences(db, userId)`: returns the stored row or the defaults.
  - `saveTrainingPreferences(db, userId, input)`: upserts with `onConflictDoUpdate` and sets `updatedAt`.
- `GET /api/preferences/training`: returns `TrainingPreferences`.
- `PUT /api/preferences/training`: validates the body, returns `400` on invalid input, and returns the saved values.
- Both handlers require a session and scope every query by the authenticated user ID.

## 2. Progression endpoint

**Server**

- Add `GET /api/workouts/progression?today=YYYY-MM-DD`. Validate `today` the same way as the activity endpoint and return `400` otherwise.
- Add `listRecentExerciseSessions(db, userId, window)` in `server/utils/workouts.ts`. Return raw rows: exercise ID, localized name, workout ID, workout date, completed time, unit, set position, weight, and reps.
  - Completed workouts only, scoped by user.
  - Exercises are selected by sessions inside the 28-day window. For those exercises, also return enough earlier sessions to evaluate the 3-session stall rule.
  - Order by `workout_date` desc, `completed_at` desc, then set position.
- The handler loads preferences, groups the rows, and calls the shared functions. Status logic does not live in SQL.
- Check the query with `EXPLAIN` against the existing `(user_id, workout_date)` completed-workouts index before adding another index.

**Shared logic (`shared/progression/`)**

Pure functions, with preferences passed in:

- `progressionWindow(today)` returns `{ start, end }`.
- `summarizeSession(sets)` returns `{ workingWeight, reps, totalReps }`.
- `progressionStatus(sessions, preferences)` returns a `ProgressionStatus`.
- `suggestedWeight(session, preferences)` returns a decimal string or `null`.
- `buildExerciseProgression(sessions, preferences)` returns an `ExerciseProgression`.

**Types**

```ts
export type ProgressionStatus = "ready" | "building" | "below" | "stalled";

export interface ExerciseProgression {
  exerciseId: string;
  name: string;
  unit: WorkoutUnit; // unit of the latest session
  lastDate: string; // YYYY-MM-DD
  workingWeight: string;
  reps: number[]; // latest session, in set order
  progress: number; // 0..1
  status: ProgressionStatus;
  suggestedWeight: string | null;
  weightHistory: { date: string; weight: string }[];
}

export interface WorkoutProgression {
  preferences: TrainingPreferences;
  items: ExerciseProgression[];
}
```

## 3. UI

**Dashboard (`app/pages/app/index.vue`)**

- `useProgression()` composable in `app/composables/workouts/`, following `useActivity`: `preferences`, `items`, `status`, and `refresh()`, called in `onMounted`.
- Place the Progression card between the workout card and the Activity card. Use the same loading, error, and retry pattern as the Activity card.
- Pass `preferences.unit` to `StartWorkoutModal` as `defaultUnit`, falling back to `"lb"` while loading.

**Presentational components (`app/components/workouts/presentational/`)**

None of these fetch data.

- `ProgressionCard.vue`: header with a count of `ready` exercises, a subtitle such as "Range 8–12 · +5 lb" with a Change link to `/app/profile`, the list, and an empty state when nothing was trained in 28 days.
- `ProgressionRow.vue`: exercise name, working weight and reps (for example `80 lb · 12 · 12 · 11`), `UProgress` bar, a status `UBadge`, and the status message.
  - Badge colors: `ready` success, `building` primary, `below` warning, `stalled` neutral.
- `WeightStaircase.vue`: small hand-written SVG step chart of `weightHistory`. No chart library.
- `StartWorkoutModal.vue`: add a `defaultUnit` prop used when the form resets.

**Profile (`/app/profile`)**

- The profile page lives in the auth layer, which must not depend on workout code. Add an extension point instead of copying the page:
  - Add an empty `ProfileExtraSections.vue` in `layers/auth/app/components/` and render it in `layers/auth/app/pages/app/profile.vue`.
  - Override it in the app with `app/components/ProfileExtraSections.vue`. App components take precedence over layer components with the same name.
- The app override renders a Training section container that uses `useTrainingPreferences()`:
  - `useTrainingPreferences()`: `preferences`, `status`, `saveState` (reusing `SaveState`), `load()`, and `save(values)`.
  - `TrainingPreferencesForm.vue` (presentational): `UForm` with `trainingPreferencesSchema`, fields for rep min, rep max, main unit, and weight step. The step field shows the selected unit. Emits `submit` with validated values.
  - Show a success toast on save, matching the existing profile forms.

## 4. Tests

- `tests/progression.test.ts`:
  - Each status, including boundaries: all sets at exactly `repMax`, a set at exactly `repMin`, and a mix such as `12, 12, 11`.
  - A custom range changes the result: `12, 12, 10` is `ready` for 6–10 and `building` for 8–12.
  - Stall detection needs 3 same-unit sessions and ignores sessions in another unit.
  - Progress is capped at `1`.
  - Suggested weight: `82.5 + 2.5 = 85.00`, `0.01` steps, and `null` when the session unit differs from the main unit.
  - Window bounds for several `today` values.
- `tests/workouts-validation.test.ts` or a new validation test file:
  - Rejects `repMin >= repMax`, reps outside 1 to 100, non-integer reps, a step of `0` or less, steps with 3 decimals, and an unknown unit.
- `tests/db/*.test.ts` (requires `TEST_DATABASE_URL`):
  - Preferences: GET returns defaults with no row, PUT inserts, a second PUT updates, users cannot read or change each other's preferences, and deleting the user removes the row.
  - Progression: excludes drafts, other users' workouts, and exercises not trained in the window; orders by most recent; returns earlier sessions needed for stall detection.
- `tests/frontend/`:
  - `ProgressionRow` shows the correct badge and message for each status.
  - `TrainingPreferencesForm` shows validation errors and emits clean values.
  - `StartWorkoutModal` uses `defaultUnit`.

## Deferred

- Per-exercise rep ranges and weight steps.
- Automatic conversion of the weight step or history between units.
- Pinned exercises and an exercise progression detail page.
- A "target today" hint in the workout editor.
