import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type postgres from "postgres";
import { DEFAULT_TRAINING_PREFERENCES } from "../../shared/progression/preferences";
import { progressionWindow } from "../../shared/progression/progression";
import {
  buildProgressionItems,
  groupSessionsByExercise,
} from "../../server/utils/progression";
import {
  addExerciseToWorkout,
  completeWorkout,
  listRecentExerciseSessions,
  saveSet,
  startDraft,
  type WorkoutDb,
} from "../../server/utils/workouts";
import {
  createExercise,
  createUser,
  deleteExercise,
  deleteUser,
  openTestDatabase,
} from "./helpers";

let client: ReturnType<typeof postgres>;
let db: WorkoutDb;
const users: string[] = [];
const exerciseIds: string[] = [];

const today = "2026-11-25";
const window = progressionWindow(today);

before(async () => {
  const opened = await openTestDatabase();
  client = opened.client;
  db = opened.db;
});

after(async () => {
  for (const id of users) await deleteUser(db, id);
  for (const id of exerciseIds) await deleteExercise(db, id);
  await client.end();
});

async function newUser() {
  const id = await createUser(db);
  users.push(id);
  return id;
}

async function newExercise() {
  const id = await createExercise(db);
  exerciseIds.push(id);
  return id;
}

async function finishedWorkout(
  userId: string,
  date: string,
  exerciseId: string,
  sets: Array<{ weight: string; reps: string }>,
  unit: "kg" | "lb" = "lb",
): Promise<string> {
  const { workout } = await startDraft(db, userId, {
    date,
    focus: "Push",
    unit,
  });
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId,
    expectedStatus: "draft",
  });
  for (const set of sets) {
    await saveSet(db, userId, workout.id, {
      id: randomUUID(),
      exerciseId,
      ...set,
      expectedStatus: "draft",
    });
  }
  await completeWorkout(db, userId, workout.id);
  return workout.id;
}

test("recent sessions exclude drafts, other users, and untrained exercises", async () => {
  const userId = await newUser();
  const other = await newUser();
  const trained = await newExercise();
  const draftOnly = await newExercise();
  const stale = await newExercise();
  const otherOnly = await newExercise();

  await finishedWorkout(userId, "2026-11-20", trained, [
    { weight: "100", reps: "10" },
  ]);
  await finishedWorkout(userId, "2026-09-01", stale, [
    { weight: "50", reps: "8" },
  ]);
  await finishedWorkout(other, "2026-11-22", otherOnly, [
    { weight: "70", reps: "9" },
  ]);
  const draft = await startDraft(db, userId, {
    date: "2026-11-24",
    focus: "Push",
    unit: "lb",
  });
  await addExerciseToWorkout(db, userId, draft.workout.id, {
    exerciseId: draftOnly,
    expectedStatus: "draft",
  });
  await saveSet(db, userId, draft.workout.id, {
    id: randomUUID(),
    exerciseId: draftOnly,
    weight: "999",
    reps: "1",
    expectedStatus: "draft",
  });

  const rows = await listRecentExerciseSessions(db, userId, window);

  assert.deepEqual([...new Set(rows.map((row) => row.exerciseId))], [trained]);
  assert.ok(rows.every((row) => row.weight !== "999.00"));
  assert.ok(rows.every((row) => row.workoutDate !== "2026-09-01"));
});

test("recent sessions are ordered by most recent session, then set position", async () => {
  const userId = await newUser();
  const older = await newExercise();
  const newer = await newExercise();

  await finishedWorkout(userId, "2026-11-01", older, [
    { weight: "60", reps: "10" },
  ]);
  await finishedWorkout(userId, "2026-11-15", older, [
    { weight: "62.5", reps: "10" },
    { weight: "62.5", reps: "8" },
  ]);
  await finishedWorkout(userId, "2026-11-20", newer, [
    { weight: "40", reps: "12" },
  ]);

  const rows = await listRecentExerciseSessions(db, userId, window);

  assert.deepEqual(
    rows.map((row) => [row.workoutDate, row.position]),
    [
      ["2026-11-20", 1],
      ["2026-11-15", 1],
      ["2026-11-15", 2],
      ["2026-11-01", 1],
    ],
  );

  const items = buildProgressionItems(
    rows,
    DEFAULT_TRAINING_PREFERENCES,
    window,
  );
  assert.deepEqual(
    items.map((item) => item.exerciseId),
    [newer, older],
  );
  assert.deepEqual(items[1]?.reps, [10, 8]);
});

test("recent sessions include earlier same-unit sessions for stall detection", async () => {
  const userId = await newUser();
  const exerciseId = await newExercise();

  await finishedWorkout(userId, "2026-09-01", exerciseId, [
    { weight: "100", reps: "10" },
  ]);
  await finishedWorkout(
    userId,
    "2026-09-15",
    exerciseId,
    [{ weight: "100", reps: "10" }],
    "kg",
  );
  await finishedWorkout(userId, "2026-09-20", exerciseId, [
    { weight: "100", reps: "10" },
  ]);
  await finishedWorkout(userId, "2026-11-20", exerciseId, [
    { weight: "100", reps: "10" },
  ]);

  const rows = await listRecentExerciseSessions(db, userId, window);
  const sessions = groupSessionsByExercise(rows).get(exerciseId) ?? [];
  assert.equal(sessions.length, 4);

  const [item] = buildProgressionItems(
    rows,
    DEFAULT_TRAINING_PREFERENCES,
    window,
  );
  assert.equal(item?.status, "stalled");
  assert.deepEqual(
    item?.weightHistory.map((entry) => entry.date),
    ["2026-11-20"],
  );
});
