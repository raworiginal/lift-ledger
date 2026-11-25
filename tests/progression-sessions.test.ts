import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TRAINING_PREFERENCES } from "../shared/progression/preferences";
import { progressionWindow } from "../shared/progression/progression";
import {
  buildProgressionItems,
  groupSessionsByExercise,
} from "../server/utils/progression";
import type { RecentExerciseSessionRow } from "../server/utils/workouts";

const window = progressionWindow("2026-11-25");

function row(
  overrides: Partial<RecentExerciseSessionRow> &
    Pick<RecentExerciseSessionRow, "exerciseId" | "workoutId" | "workoutDate">,
): RecentExerciseSessionRow {
  return {
    name: overrides.exerciseId,
    completedAt: new Date(`${overrides.workoutDate}T18:00:00Z`),
    unit: "lb",
    position: 1,
    weight: "100",
    reps: 10,
    ...overrides,
  };
}

test("rows group into one session per workout and keep set order", () => {
  const grouped = groupSessionsByExercise([
    row({
      exerciseId: "bench",
      workoutId: "w2",
      workoutDate: "2026-11-20",
      position: 1,
      weight: "80",
      reps: 12,
    }),
    row({
      exerciseId: "bench",
      workoutId: "w2",
      workoutDate: "2026-11-20",
      position: 2,
      weight: "80",
      reps: 11,
    }),
    row({
      exerciseId: "bench",
      workoutId: "w1",
      workoutDate: "2026-11-10",
      position: 1,
      weight: "75",
      reps: 12,
    }),
  ]);

  const sessions = grouped.get("bench") ?? [];
  assert.equal(sessions.length, 2);
  assert.deepEqual(
    sessions[0]?.sets.map((set) => set.reps),
    [12, 11],
  );
  assert.equal(sessions[0]?.date, "2026-11-20");
  assert.equal(sessions[1]?.sets[0]?.weight, "75");
});

test("items skip exercises with no session in the window", () => {
  const items = buildProgressionItems(
    [
      row({
        exerciseId: "old",
        workoutId: "w1",
        workoutDate: "2026-09-01",
      }),
      row({
        exerciseId: "recent",
        workoutId: "w2",
        workoutDate: "2026-11-20",
      }),
    ],
    DEFAULT_TRAINING_PREFERENCES,
    window,
  );

  assert.deepEqual(
    items.map((item) => item.exerciseId),
    ["recent"],
  );
});

test("items are sorted by most recent session and capped at 8", () => {
  const rows: RecentExerciseSessionRow[] = [];
  for (let index = 0; index < 10; index += 1) {
    rows.push(
      row({
        exerciseId: `exercise-${index}`,
        workoutId: `workout-${index}`,
        workoutDate: `2026-11-${String(10 + index).padStart(2, "0")}`,
      }),
    );
  }

  const items = buildProgressionItems(
    rows,
    DEFAULT_TRAINING_PREFERENCES,
    window,
  );

  assert.equal(items.length, 8);
  assert.equal(items[0]?.exerciseId, "exercise-9");
  assert.equal(items[7]?.exerciseId, "exercise-2");
  assert.deepEqual(
    items.map((item) => item.lastDate),
    [...items.map((item) => item.lastDate)].sort().reverse(),
  );
});

test("earlier sessions outside the window feed stall detection", () => {
  const rows = [
    row({
      exerciseId: "row",
      workoutId: "w3",
      workoutDate: "2026-11-20",
      reps: 10,
    }),
    row({
      exerciseId: "row",
      workoutId: "w2",
      workoutDate: "2026-09-20",
      reps: 10,
    }),
    row({
      exerciseId: "row",
      workoutId: "w1",
      workoutDate: "2026-09-10",
      reps: 10,
    }),
  ];

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
