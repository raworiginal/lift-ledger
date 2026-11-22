import assert from "node:assert/strict";
import test from "node:test";
import {
  canFinish,
  nextPrefill,
  numberSetsWithinExercise,
} from "../app/utils/workout-sets";
import { localDateString } from "../app/utils/workout-dates";
import { newWorkoutId } from "../app/utils/workout-ids";
import {
  saveSetRequestSchema,
  startWorkoutRequestSchema,
  updateSetRequestSchema,
} from "../shared/validation/workouts";

const setId = "11111111-1111-4111-8111-111111111111";

test("set numbers restart per exercise and follow stored position", () => {
  const numbered = numberSetsWithinExercise([
    { id: "c", exerciseId: "bench", position: 3 },
    { id: "a", exerciseId: "squat", position: 1 },
    { id: "b", exerciseId: "bench", position: 2 },
    { id: "d", exerciseId: "squat", position: 5 },
  ]);

  assert.deepEqual(
    numbered.map((set) => [set.id, set.setNumber]),
    [
      ["a", 1],
      ["b", 1],
      ["c", 2],
      ["d", 2],
    ],
  );
});

test("prefill is empty without a previous set and copies the last set otherwise", () => {
  assert.deepEqual(nextPrefill(null), { weight: "", reps: "" });
  assert.deepEqual(nextPrefill({ weight: "102.50", reps: 6 }), {
    weight: "102.50",
    reps: "6",
  });
});

test("a workout can finish only as a draft with at least one set", () => {
  const withSet = {
    status: "draft" as const,
    exercises: [
      {
        exerciseId: "bench",
        name: "Bench",
        position: 1,
        sets: [
          {
            id: setId,
            exerciseId: "bench",
            position: 1,
            setNumber: 1,
            weight: "0.00",
            reps: 1,
          },
        ],
      },
    ],
  };
  const empty = {
    ...withSet,
    exercises: [{ ...withSet.exercises[0], sets: [] }],
  };

  assert.equal(canFinish(withSet), true);
  assert.equal(canFinish(empty), false);
  assert.equal(canFinish({ ...withSet, status: "completed" }), false);
});

test("local date uses the device's calendar date, not UTC", () => {
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
  assert.equal(localDateString(new Date(2026, 11, 31, 0, 1)), "2026-12-31");
});

test("workout ids are UUID v4 values", () => {
  assert.match(
    newWorkoutId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("start request rejects future dates and accepts today", () => {
  const body = { today: "2026-11-20", focus: "Push", unit: "lb" };

  assert.equal(
    startWorkoutRequestSchema.safeParse({ ...body, date: "2026-11-20" })
      .success,
    true,
  );
  const future = startWorkoutRequestSchema.safeParse({
    ...body,
    date: "2026-11-21",
  });
  assert.equal(future.success, false);
  assert.equal(future.error?.issues[0]?.path[0], "date");
});

test("save set request requires a UUID and non-empty weight", () => {
  const body = {
    id: setId,
    exerciseId: "bench-press",
    weight: "0",
    reps: "8",
    expectedStatus: "draft",
  };

  assert.equal(saveSetRequestSchema.safeParse(body).success, true);
  assert.equal(
    saveSetRequestSchema.safeParse({ ...body, id: "not-a-uuid" }).success,
    false,
  );
  assert.equal(
    saveSetRequestSchema.safeParse({ ...body, weight: "" }).success,
    false,
  );
});

test("update set request needs at least one field", () => {
  assert.equal(
    updateSetRequestSchema.safeParse({ expectedStatus: "completed" }).success,
    false,
  );
  assert.equal(
    updateSetRequestSchema.safeParse({ reps: "5", expectedStatus: "completed" })
      .success,
    true,
  );
});
