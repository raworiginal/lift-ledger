import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import type postgres from "postgres";
import { heatmapWindow } from "../../shared/activity/heatmap";
import { workouts, workoutSets } from "../../server/db/schema/workouts";
import {
  addExerciseToWorkout,
  completeWorkout,
  deleteSet,
  deleteWorkout,
  getDraft,
  getWorkoutDetail,
  listActiveDays,
  listCompletedWorkouts,
  removeExerciseFromWorkout,
  saveSet,
  startDraft,
  updateSet,
  updateWorkout,
  WorkoutError,
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

const today = "2026-11-20";

let assistedExerciseId: string;

before(async () => {
  const opened = await openTestDatabase();
  client = opened.client;
  db = opened.db;
  exerciseIds.push(await createExercise(db), await createExercise(db));
  assistedExerciseId = await createExercise(db, "Assisted Pull Ups");
  exerciseIds.push(assistedExerciseId);
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

async function startWorkout(userId: string, date = today) {
  const { workout } = await startDraft(db, userId, {
    date,
    focus: "Push",
    unit: "lb",
  });
  return workout;
}

async function expectWorkoutError(
  promise: Promise<unknown>,
  statusCode: number,
) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof WorkoutError, "expected a WorkoutError");
    assert.equal(error.statusCode, statusCode);
    return true;
  });
}

test("a user can have only one draft", async () => {
  const userId = await newUser();

  const first = await startDraft(db, userId, {
    date: today,
    focus: "Push",
    unit: "lb",
  });
  const second = await startDraft(db, userId, {
    date: today,
    focus: "Legs",
    unit: "kg",
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.workout.id, first.workout.id);
  assert.equal(second.workout.focus, "Push");

  const otherUser = await newUser();
  const otherDraft = await startWorkout(otherUser);
  assert.notEqual(otherDraft.id, first.workout.id);
});

test("a retried set submission does not create a second set", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });

  const setId = randomUUID();
  const input = {
    id: setId,
    exerciseId: exerciseIds[0],
    weight: "100.00",
    reps: "5",
    expectedStatus: "draft" as const,
  };

  const first = await saveSet(db, userId, workout.id, input);
  const retry = await saveSet(db, userId, workout.id, input);

  assert.equal(first.created, true);
  assert.equal(retry.created, false);
  assert.equal(retry.set.id, setId);

  const detail = await getWorkoutDetail(db, userId, workout.id);
  assert.equal(detail?.setCount, 1);
});

test("finishing an empty draft is rejected", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);

  await expectWorkoutError(completeWorkout(db, userId, workout.id), 400);

  const draft = await getDraft(db, userId);
  assert.equal(draft?.status, "draft");
});

test("finishing twice returns the completed workout", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "60",
    reps: "8",
    expectedStatus: "draft",
  });

  const first = await completeWorkout(db, userId, workout.id);
  const second = await completeWorkout(db, userId, workout.id);

  assert.equal(first.status, "completed");
  assert.equal(second.completedAt, first.completedAt);
  assert.equal(await getDraft(db, userId), null);
});

test("a stale expected status is rejected with 409", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "60",
    reps: "8",
    expectedStatus: "draft",
  });
  await completeWorkout(db, userId, workout.id);

  await expectWorkoutError(
    updateWorkout(db, userId, workout.id, {
      focus: "Pull",
      expectedStatus: "draft",
    }),
    409,
  );
});

test("the unit cannot change once sets exist", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);

  await updateWorkout(db, userId, workout.id, {
    unit: "kg",
    expectedStatus: "draft",
  });

  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "20",
    reps: "10",
    expectedStatus: "draft",
  });

  await expectWorkoutError(
    updateWorkout(db, userId, workout.id, {
      unit: "lb",
      expectedStatus: "draft",
    }),
    409,
  );
});

test("an exercise with sets cannot be removed", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[1],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[1],
    weight: "0",
    reps: "12",
    expectedStatus: "draft",
  });

  await expectWorkoutError(
    removeExerciseFromWorkout(db, userId, workout.id, {
      exerciseId: exerciseIds[1],
      expectedStatus: "draft",
    }),
    409,
  );
});

test("a completed workout keeps at least one set", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  const { set } = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "80",
    reps: "5",
    expectedStatus: "draft",
  });
  await completeWorkout(db, userId, workout.id);

  await expectWorkoutError(
    deleteSet(db, userId, workout.id, set.id, "completed"),
    409,
  );
});

test("set numbers restart per exercise and survive deletes", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  for (const exerciseId of exerciseIds) {
    await addExerciseToWorkout(db, userId, workout.id, {
      exerciseId,
      expectedStatus: "draft",
    });
  }

  const first = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "50",
    reps: "10",
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[1],
    weight: "30",
    reps: "10",
    expectedStatus: "draft",
  });
  const third = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "55",
    reps: "8",
    expectedStatus: "draft",
  });

  await deleteSet(db, userId, workout.id, first.set.id, "draft");

  const detail = await getWorkoutDetail(db, userId, workout.id);
  const groupA = detail?.exercises.find(
    (group) => group.exerciseId === exerciseIds[0],
  );
  const groupB = detail?.exercises.find(
    (group) => group.exerciseId === exerciseIds[1],
  );

  assert.deepEqual(
    groupA?.sets.map((set) => set.setNumber),
    [1],
  );
  assert.equal(groupA?.sets[0].id, third.set.id);
  assert.equal(groupA?.sets[0].position, third.set.position);
  assert.equal(groupB?.sets[0].setNumber, 1);
});

test("updating a set changes weight and reps as stored decimals", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  const { set } = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "100",
    reps: "5",
    expectedStatus: "draft",
  });

  const updated = await updateSet(db, userId, workout.id, set.id, {
    weight: "102.5",
    reps: "6",
    expectedStatus: "draft",
  });

  assert.equal(updated.weight, "102.50");
  assert.equal(updated.reps, 6);
});

test("account isolation covers workouts, exercises, and sets", async () => {
  const owner = await newUser();
  const intruder = await newUser();
  const workout = await startWorkout(owner);
  await addExerciseToWorkout(db, owner, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  const { set } = await saveSet(db, owner, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "40",
    reps: "10",
    expectedStatus: "draft",
  });

  assert.equal(await getDraft(db, intruder), null);
  assert.equal(await getWorkoutDetail(db, intruder, workout.id), null);

  await expectWorkoutError(
    updateWorkout(db, intruder, workout.id, {
      focus: "Hacked",
      expectedStatus: "draft",
    }),
    404,
  );
  await expectWorkoutError(
    deleteWorkout(db, intruder, workout.id, "draft"),
    404,
  );
  await expectWorkoutError(
    addExerciseToWorkout(db, intruder, workout.id, {
      exerciseId: exerciseIds[1],
      expectedStatus: "draft",
    }),
    404,
  );
  await expectWorkoutError(
    saveSet(db, intruder, workout.id, {
      id: randomUUID(),
      exerciseId: exerciseIds[0],
      weight: "1",
      reps: "1",
      expectedStatus: "draft",
    }),
    404,
  );
  await expectWorkoutError(
    updateSet(db, intruder, workout.id, set.id, {
      reps: "1",
      expectedStatus: "draft",
    }),
    404,
  );
  await expectWorkoutError(
    deleteSet(db, intruder, workout.id, set.id, "draft"),
    404,
  );
  await expectWorkoutError(completeWorkout(db, intruder, workout.id), 404);

  const unchanged = await getWorkoutDetail(db, owner, workout.id);
  assert.equal(unchanged?.focus, "Push");
  assert.equal(unchanged?.setCount, 1);
});

test("history lists only completed workouts, newest first, with keyset paging", async () => {
  const userId = await newUser();
  const dates = ["2026-01-01", "2026-01-03", "2026-01-02"];

  for (const date of dates) {
    const workout = await startWorkout(userId, date);
    await addExerciseToWorkout(db, userId, workout.id, {
      exerciseId: exerciseIds[0],
      expectedStatus: "draft",
    });
    await saveSet(db, userId, workout.id, {
      id: randomUUID(),
      exerciseId: exerciseIds[0],
      weight: "20",
      reps: "10",
      expectedStatus: "draft",
    });
    await completeWorkout(db, userId, workout.id);
  }
  await startWorkout(userId, "2026-01-04");

  const firstPage = await listCompletedWorkouts(db, userId, { limit: 2 });
  assert.deepEqual(
    firstPage.items.map((item) => item.workoutDate),
    ["2026-01-03", "2026-01-02"],
  );
  assert.ok(firstPage.nextCursor);

  const secondPage = await listCompletedWorkouts(db, userId, {
    limit: 2,
    cursor: firstPage.nextCursor ?? undefined,
  });
  assert.deepEqual(
    secondPage.items.map((item) => item.workoutDate),
    ["2026-01-01"],
  );
  assert.equal(secondPage.nextCursor, null);

  await expectWorkoutError(
    listCompletedWorkouts(db, userId, { cursor: "not-a-cursor" }),
    400,
  );
});

test("deleting a completed workout removes its exercises and sets", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "20",
    reps: "10",
    expectedStatus: "draft",
  });
  await completeWorkout(db, userId, workout.id);

  await deleteWorkout(db, userId, workout.id, "completed");

  assert.equal(await getWorkoutDetail(db, userId, workout.id), null);
  const remaining = await db
    .select({ id: workoutSets.id })
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, workout.id));
  assert.equal(remaining.length, 0);
});

test("deleting a user deletes their workouts", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "20",
    reps: "10",
    expectedStatus: "draft",
  });

  await deleteUser(db, userId);
  users.splice(users.indexOf(userId), 1);

  const rows = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.userId, userId));
  assert.equal(rows.length, 0);
});

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

async function setCompletedAt(workoutId: string, completedAt: string) {
  await db
    .update(workouts)
    .set({ completedAt: new Date(completedAt) })
    .where(eq(workouts.id, workoutId));
}

function groupFor(
  detail: Awaited<ReturnType<typeof getWorkoutDetail>>,
  exerciseId: string,
) {
  return detail?.exercises.find((group) => group.exerciseId === exerciseId);
}

test("last time picks the latest completed workout by date, then completed_at", async () => {
  const userId = await newUser();
  const sameDayEarlier = await finishedWorkout(
    userId,
    "2026-03-01",
    exerciseIds[0],
    [{ weight: "100", reps: "5" }],
  );
  const sameDayLater = await finishedWorkout(
    userId,
    "2026-03-01",
    exerciseIds[0],
    [{ weight: "110", reps: "3" }],
  );
  const olderDateCompletedLast = await finishedWorkout(
    userId,
    "2026-02-01",
    exerciseIds[0],
    [{ weight: "90", reps: "8" }],
  );
  await setCompletedAt(sameDayEarlier, "2026-03-01T10:00:00Z");
  await setCompletedAt(sameDayLater, "2026-03-01T18:00:00Z");
  await setCompletedAt(olderDateCompletedLast, "2026-12-01T10:00:00Z");

  const next = await startWorkout(userId, "2026-03-10");
  await addExerciseToWorkout(db, userId, next.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });

  const lastTime = groupFor(
    await getWorkoutDetail(db, userId, next.id),
    exerciseIds[0],
  )?.lastTime;

  assert.equal(lastTime?.workoutId, sameDayLater);
  assert.equal(lastTime?.workoutDate, "2026-03-01");
  assert.equal(lastTime?.unit, "lb");
  assert.deepEqual(
    lastTime?.sets.map((set) => [set.weight, set.reps]),
    [["110.00", 3]],
  );
});

test("last time ignores drafts, other users, and the workout being viewed", async () => {
  const owner = await newUser();
  const other = await newUser();
  const earlier = await finishedWorkout(owner, "2026-04-01", exerciseIds[0], [
    { weight: "100", reps: "5" },
  ]);
  const middle = await finishedWorkout(owner, "2026-04-05", exerciseIds[0], [
    { weight: "120", reps: "2" },
  ]);
  await finishedWorkout(other, "2026-04-08", exerciseIds[0], [
    { weight: "777", reps: "1" },
  ]);

  const draft = await startWorkout(owner, "2026-04-10");
  await addExerciseToWorkout(db, owner, draft.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await saveSet(db, owner, draft.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "999",
    reps: "1",
    expectedStatus: "draft",
  });

  const draftLastTime = groupFor(
    await getWorkoutDetail(db, owner, draft.id),
    exerciseIds[0],
  )?.lastTime;
  assert.equal(draftLastTime?.workoutId, middle);

  const completedLastTime = groupFor(
    await getWorkoutDetail(db, owner, middle),
    exerciseIds[0],
  )?.lastTime;
  assert.equal(completedLastTime?.workoutId, earlier);
  assert.deepEqual(
    completedLastTime?.sets.map((set) => set.weight),
    ["100.00"],
  );
});

test("last time is null when no earlier completed workout has the exercise", async () => {
  const userId = await newUser();
  const only = await finishedWorkout(userId, "2026-05-01", exerciseIds[0], [
    { weight: "60", reps: "10" },
  ]);

  const ownLastTime = groupFor(
    await getWorkoutDetail(db, userId, only),
    exerciseIds[0],
  )?.lastTime;
  assert.equal(ownLastTime, null);

  const draft = await startWorkout(userId, "2026-05-02");
  const added = await addExerciseToWorkout(db, userId, draft.id, {
    exerciseId: exerciseIds[1],
    expectedStatus: "draft",
  });
  assert.equal(added.exercise.lastTime, null);
});

test("adding an exercise returns its last time with the group", async () => {
  const userId = await newUser();
  const earlier = await finishedWorkout(userId, "2026-06-01", exerciseIds[0], [
    { weight: "70", reps: "6" },
  ]);
  const draft = await startWorkout(userId, "2026-06-03");

  const added = await addExerciseToWorkout(db, userId, draft.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  const existing = await addExerciseToWorkout(db, userId, draft.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });

  assert.equal(added.exercise.lastTime?.workoutId, earlier);
  assert.equal(existing.created, false);
  assert.equal(existing.exercise.lastTime?.workoutId, earlier);
});

test("last time keeps the original unit of the earlier workout", async () => {
  const userId = await newUser();
  const kgWorkout = await finishedWorkout(
    userId,
    "2026-07-01",
    exerciseIds[0],
    [{ weight: "50", reps: "8" }],
    "kg",
  );
  const draft = await startWorkout(userId, "2026-07-03");
  await addExerciseToWorkout(db, userId, draft.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });

  const lastTime = groupFor(
    await getWorkoutDetail(db, userId, draft.id),
    exerciseIds[0],
  )?.lastTime;

  assert.equal(lastTime?.workoutId, kgWorkout);
  assert.equal(lastTime?.unit, "kg");
  assert.deepEqual(
    lastTime?.sets.map((set) => set.weight),
    ["50.00"],
  );
});

test("active days include only the user's completed workouts inside the window", async () => {
  const userId = await newUser();
  const other = await newUser();
  const today = "2026-11-20";
  const window = heatmapWindow(today);

  await finishedWorkout(userId, today, exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await finishedWorkout(userId, today, exerciseIds[0], [
    { weight: "25", reps: "10" },
  ]);
  await finishedWorkout(userId, window.start, exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await finishedWorkout(userId, "2026-11-22", exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await finishedWorkout(userId, "2026-11-23", exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await finishedWorkout(userId, "2025-11-23", exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await finishedWorkout(other, today, exerciseIds[0], [
    { weight: "20", reps: "10" },
  ]);
  await startWorkout(userId, "2026-11-19");

  const activity = await listActiveDays(db, userId, window);

  assert.deepEqual(activity.activeDates, [window.start, today, "2026-11-22"]);
});

test("regular exercises reject negative weights and accept zero", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });

  await expectWorkoutError(
    saveSet(db, userId, workout.id, {
      id: randomUUID(),
      exerciseId: exerciseIds[0],
      weight: "-5",
      reps: "8",
      expectedStatus: "draft",
    }),
    422,
  );

  const zero = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "0",
    reps: "8",
    expectedStatus: "draft",
  });
  assert.equal(zero.set.weight, "0.00");
});

test("assisted exercises store negative weights and reject positive ones", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: assistedExerciseId,
    expectedStatus: "draft",
  });

  await expectWorkoutError(
    saveSet(db, userId, workout.id, {
      id: randomUUID(),
      exerciseId: assistedExerciseId,
      weight: "5",
      reps: "8",
      expectedStatus: "draft",
    }),
    422,
  );

  const saved = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: assistedExerciseId,
    weight: "-20",
    reps: "8",
    expectedStatus: "draft",
  });
  assert.equal(saved.set.weight, "-20.00");

  const detail = await getWorkoutDetail(db, userId, workout.id);
  const group = detail?.exercises.find(
    (item) => item.exerciseId === assistedExerciseId,
  );
  assert.equal(group?.assisted, true);
  assert.equal(group?.sets[0]?.weight, "-20.00");
});

test("updating a set keeps the sign rule for its exercise", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: exerciseIds[0],
    expectedStatus: "draft",
  });
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: assistedExerciseId,
    expectedStatus: "draft",
  });
  const regular = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: exerciseIds[0],
    weight: "60",
    reps: "8",
    expectedStatus: "draft",
  });
  const assisted = await saveSet(db, userId, workout.id, {
    id: randomUUID(),
    exerciseId: assistedExerciseId,
    weight: "-20",
    reps: "8",
    expectedStatus: "draft",
  });

  await expectWorkoutError(
    updateSet(db, userId, workout.id, regular.set.id, {
      weight: "-10",
      expectedStatus: "draft",
    }),
    422,
  );
  await expectWorkoutError(
    updateSet(db, userId, workout.id, assisted.set.id, {
      weight: "5",
      expectedStatus: "draft",
    }),
    422,
  );

  const updated = await updateSet(db, userId, workout.id, assisted.set.id, {
    weight: "-15",
    expectedStatus: "draft",
  });
  assert.equal(updated.weight, "-15.00");
});

test("the database rejects weights outside the stored range", async () => {
  const userId = await newUser();
  const workout = await startWorkout(userId);
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: assistedExerciseId,
    expectedStatus: "draft",
  });

  await assert.rejects(
    db.insert(workoutSets).values({
      id: randomUUID(),
      workoutId: workout.id,
      exerciseId: assistedExerciseId,
      position: 1,
      weight: "-10000",
      reps: 8,
    }),
  );
});
