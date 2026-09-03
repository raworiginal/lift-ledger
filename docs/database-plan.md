# Database Plan

This is a full-stack Nuxt application deployed in a self-hosted Docker container. It uses SQLite with Drizzle ORM through NuxtHub.

## Conventions

- Better Auth provides the `user` table with a `TEXT` primary key. One additional field: `weight_unit TEXT NOT NULL DEFAULT 'kg'`, check in `('kg', 'lb')`.
- The exercise catalog is shared by all users. Any user can add or edit exercises.
- Routines and workouts reference `user.id` with `ON DELETE CASCADE`. Every query filters by `user_id` in the app.
- Primary keys are SQLite `INTEGER PRIMARY KEY` values.
- Timestamps are UTC Unix epoch milliseconds stored as `INTEGER` values.
- Loads are `REAL` values in the user's `weight_unit`.
- Names use `COLLATE NOCASE`.
- Exercises referenced by history are archived with `is_active = 0` instead of deleted. Everything else is hard-deleted.
- SQLite foreign-key enforcement must be enabled.

## Movement Patterns

A movement pattern is a `TEXT` value with a check constraint, not a table. It groups interchangeable exercises so a routine slot can say "any horizontal push". Allowed values:

`vertical_pull`, `horizontal_pull`, `vertical_push`, `horizontal_push`, `squat`, `hinge`, `carry`, `rotation`, `anti_rotation`, `elbow_flexion`, `elbow_extension`, `knee_flexion`, `knee_extension`, `calf_raise`, `shoulder_abduction`

Exercises that fit no pattern leave it null and can only be placed in a routine slot directly.

## Exercises

### `exercises`

| Column             | Type      | Constraints                                                                 |
| ------------------ | --------- | --------------------------------------------------------------------------- |
| `id`               | `INTEGER` | Primary key                                                                 |
| `name`             | `TEXT`    | Not null, `COLLATE NOCASE`                                                  |
| `equipment`        | `TEXT`    | Not null; examples: `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight` |
| `movement_pattern` | `TEXT`    | Nullable, check in the list above                                           |
| `is_active`        | `INTEGER` | Not null, default `1`, check in `(0, 1)`                                    |

Unique (`name`, `equipment`).

Bodyweight exercise load is signed: positive means added weight, zero means bodyweight only, negative means assistance.

## Routines

A routine is a user-owned, ordered list of slots. A slot names either a movement pattern (pick a matching exercise during the workout) or one fixed exercise, never both.

### `routines`

| Column    | Type      | Constraints                                                 |
| --------- | --------- | ----------------------------------------------------------- |
| `id`      | `INTEGER` | Primary key                                                 |
| `user_id` | `TEXT`    | Not null, foreign key to `user.id` with `ON DELETE CASCADE` |
| `name`    | `TEXT`    | Not null, `COLLATE NOCASE`                                  |
| `notes`   | `TEXT`    | Nullable                                                    |

Unique (`user_id`, `name`).

### `routine_items`

| Column             | Type      | Constraints                                                       |
| ------------------ | --------- | ----------------------------------------------------------------- |
| `id`               | `INTEGER` | Primary key                                                       |
| `routine_id`       | `INTEGER` | Not null, foreign key to `routines.id` with `ON DELETE CASCADE`   |
| `position`         | `INTEGER` | Not null, check `>= 0`                                            |
| `movement_pattern` | `TEXT`    | Nullable, check in the list above                                 |
| `exercise_id`      | `INTEGER` | Nullable, foreign key to `exercises.id` with `ON DELETE RESTRICT` |
| `target`           | `TEXT`    | Nullable, free text such as `3x8-12`                              |
| `notes`            | `TEXT`    | Nullable                                                          |

- Check: exactly one of `movement_pattern` and `exercise_id` is non-null.
- Unique (`routine_id`, `position`).

## Workouts

A workout records what the user actually did. It may start from a routine or be ad hoc. Targets are read live from the routine while working out; they are not copied.

### `workouts`

| Column         | Type      | Constraints                                                      |
| -------------- | --------- | ---------------------------------------------------------------- |
| `id`           | `INTEGER` | Primary key                                                      |
| `user_id`      | `TEXT`    | Not null, foreign key to `user.id` with `ON DELETE CASCADE`      |
| `routine_id`   | `INTEGER` | Nullable, foreign key to `routines.id` with `ON DELETE SET NULL` |
| `started_at`   | `INTEGER` | Not null                                                         |
| `completed_at` | `INTEGER` | Nullable, check `>= started_at`                                  |
| `notes`        | `TEXT`    | Nullable                                                         |

Index `workouts(user_id, started_at DESC)`.

### `workout_exercises`

| Column        | Type      | Constraints                                                       |
| ------------- | --------- | ----------------------------------------------------------------- |
| `id`          | `INTEGER` | Primary key                                                       |
| `workout_id`  | `INTEGER` | Not null, foreign key to `workouts.id` with `ON DELETE CASCADE`   |
| `exercise_id` | `INTEGER` | Not null, foreign key to `exercises.id` with `ON DELETE RESTRICT` |
| `position`    | `INTEGER` | Not null, check `>= 0`                                            |
| `notes`       | `TEXT`    | Nullable                                                          |

Unique (`workout_id`, `position`).

`ON DELETE RESTRICT` plus `is_active` archiving means an exercise row referenced by history can never disappear, so no name or equipment snapshots are needed. Renaming an exercise renames it in history too, which is the desired behavior.

### `workout_sets`

| Column                | Type      | Constraints                                                              |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `id`                  | `INTEGER` | Primary key                                                              |
| `workout_exercise_id` | `INTEGER` | Not null, foreign key to `workout_exercises.id` with `ON DELETE CASCADE` |
| `position`            | `INTEGER` | Not null, check `>= 0`                                                   |
| `reps`                | `INTEGER` | Not null, check `> 0`                                                    |
| `load`                | `REAL`    | Nullable; signed for assisted bodyweight exercises                       |
| `notes`               | `TEXT`    | Nullable                                                                 |

Unique (`workout_exercise_id`, `position`).

## Deferred

Add only when the feature that needs it is being built:

- `muscles` / `exercise_muscles` tables — volume-by-muscle reports.
- `duration_seconds` / `distance_meters` on sets — timed holds and carries. Use `notes` until then.
- Bodyweight logging on workouts — bodyweight chart.
- Snapshots on `workout_exercises` — only if live routine/catalog edits ever rewrite history you cared about.
- `rest_seconds` on `routine_items` — rest timer.
- Per-set `load_unit` — a user who switches units mid-history.
