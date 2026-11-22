import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { workouts, workoutSets } from "../../server/db/schema/workouts";
import {
  addExerciseToWorkout,
  completeWorkout,
  deleteSet,
  deleteWorkout,
  getDraft,
  getWorkoutDetail,
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

before(async () => {
  const opened = await openTestDatabase();
  client = opened.client;
  db = opened.db;
  exerciseIds.push(await createExercise(db), await createExercise(db));
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
