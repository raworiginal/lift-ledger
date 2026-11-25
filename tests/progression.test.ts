import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TRAINING_PREFERENCES } from "../shared/progression/preferences";
import {
  buildExerciseProgression,
  type ExerciseSession,
  progressionStatus,
  progressionWindow,
  suggestedWeight,
  summarizeSession,
} from "../shared/progression/progression";
import type { TrainingPreferences } from "../shared/types/workouts";

const preferences = DEFAULT_TRAINING_PREFERENCES;

function session(
  reps: number[],
  overrides: Partial<Omit<ExerciseSession, "sets">> & { weight?: string } = {},
): ExerciseSession {
  const { weight = "80", ...rest } = overrides;
  return {
    exerciseId: "ex-1",
    name: "Bench Press",
    date: "2026-11-20",
    completedAt: "2026-11-20T10:00:00Z",
    unit: "lb",
    ...rest,
    sets: reps.map((value) => ({ weight, reps: value })),
  };
}

// Three-set sessions, one per total, oldest first. Each set stays between 8 and 12.
function history(totals: number[]): ExerciseSession[] {
  return totals.map((total, index) => {
    const base = Math.floor(total / 3);
    const extra = total % 3;
    const date = `2026-11-${String(10 + index).padStart(2, "0")}`;
    return session(
      [base + (extra > 0 ? 1 : 0), base + (extra > 1 ? 1 : 0), base],
      {
        date,
        completedAt: `${date}T10:00:00Z`,
      },
    );
  });
}

test("the window is 28 days ending on today, inclusive", () => {
  assert.deepEqual(progressionWindow("2026-11-25"), {
    start: "2026-10-29",
    end: "2026-11-25",
  });
});

test("the window crosses month, year, and leap-day boundaries", () => {
  assert.deepEqual(progressionWindow("2026-03-01"), {
    start: "2026-02-02",
    end: "2026-03-01",
  });
  assert.deepEqual(progressionWindow("2027-01-10"), {
    start: "2026-12-14",
    end: "2027-01-10",
  });
  assert.deepEqual(progressionWindow("2028-02-29"), {
    start: "2028-02-02",
    end: "2028-02-29",
  });
  assert.deepEqual(progressionWindow("2028-03-01"), {
    start: "2028-02-03",
    end: "2028-03-01",
  });
});

test("summary takes the heaviest weight, reps in set order, and the total", () => {
  assert.deepEqual(
    summarizeSession([
      { weight: "80.00", reps: 10 },
      { weight: "82.50", reps: 8 },
      { weight: "82.50", reps: 7 },
    ]),
    { workingWeight: "82.50", reps: [10, 8, 7], totalReps: 25 },
  );
});

test("ready when every set reaches the top of the range", () => {
  assert.equal(
    progressionStatus([session([12, 12, 12])], preferences),
    "ready",
  );
});

test("ready at exactly repMax and not one rep less", () => {
  assert.equal(
    progressionStatus([session([12, 12, 11])], preferences),
    "building",
  );
  assert.equal(
    progressionStatus([session([12, 12, 12])], preferences),
    "ready",
  );
});

test("below when any set is under repMin", () => {
  assert.equal(progressionStatus([session([12, 8, 7])], preferences), "below");
});

test("a set at exactly repMin is not below", () => {
  assert.equal(
    progressionStatus([session([8, 8, 8])], preferences),
    "building",
  );
  assert.equal(progressionStatus([session([7, 8, 8])], preferences), "below");
});

test("the mix 12, 12, 11 is building, not ready", () => {
  assert.equal(
    progressionStatus([session([12, 12, 11])], preferences),
    "building",
  );
});

test("building for anything in range that is not ready", () => {
  assert.equal(
    progressionStatus([session([10, 9, 9])], preferences),
    "building",
  );
});

test("a custom range changes the result", () => {
  const custom: TrainingPreferences = { ...preferences, repMin: 6, repMax: 10 };
  const wide: TrainingPreferences = { ...preferences, repMin: 8, repMax: 12 };
  const latest = [session([12, 12, 10])];

  assert.equal(progressionStatus(latest, custom), "ready");
  assert.equal(progressionStatus(latest, wide), "building");
});

test("stalled needs three same-unit sessions with equal weight and no rep gain", () => {
  assert.equal(
    progressionStatus(history([24, 24, 24]), preferences),
    "stalled",
  );
  assert.equal(progressionStatus(history([24, 24]), preferences), "building");
  assert.equal(
    progressionStatus(history([24, 25, 24]), preferences),
    "building",
  );
});

test("stalled requires the same working weight", () => {
  const [first, second, latest] = history([24, 24, 24]);
  const heavier = session([8, 8, 8], {
    weight: "85",
    date: "2026-11-12",
    completedAt: "2026-11-12T10:00:00Z",
  });

  assert.ok(first && second && latest);
  assert.equal(
    progressionStatus([first, second, heavier], preferences),
    "building",
  );
  assert.equal(
    progressionStatus([first, second, latest], preferences),
    "stalled",
  );
});

test("stalled ignores sessions in another unit", () => {
  const sessions = [
    ...history([24, 24]),
    session([8, 8, 8], {
      unit: "kg",
      date: "2026-11-05",
      completedAt: "2026-11-05T10:00:00Z",
    }),
  ];

  assert.equal(progressionStatus(sessions, preferences), "building");
  assert.equal(
    progressionStatus(
      [
        ...history([24, 24, 24]),
        session([8, 8, 8], { unit: "kg", date: "2026-11-01" }),
      ],
      preferences,
    ),
    "stalled",
  );
});

test("sessions are judged newest first regardless of input order", () => {
  const sessions = history([24, 24, 24]).reverse();

  assert.equal(progressionStatus(sessions, preferences), "stalled");
});

test("progress is total reps over set count times repMax", () => {
  const progression = buildExerciseProgression(
    [session([12, 12, 11])],
    preferences,
    progressionWindow("2026-11-25"),
  );

  assert.equal(progression.progress, 35 / 36);
});

test("progress is capped at 1", () => {
  const progression = buildExerciseProgression(
    [session([15, 14, 13])],
    preferences,
    progressionWindow("2026-11-25"),
  );

  assert.equal(progression.progress, 1);
});

test("suggested weight adds the step in hundredths", () => {
  assert.equal(
    suggestedWeight(session([12, 12, 12], { weight: "82.5" }), {
      ...preferences,
      unit: "lb",
      weightStep: "2.5",
    }),
    "85.00",
  );
  assert.equal(
    suggestedWeight(session([12, 12], { weight: "80.00" }), {
      ...preferences,
      weightStep: "0.01",
    }),
    "80.01",
  );
});

test("suggested weight is null unless the session is ready", () => {
  assert.equal(suggestedWeight(session([12, 11]), preferences), null);
});

test("suggested weight is null when the session unit differs from the main unit", () => {
  assert.equal(
    suggestedWeight(session([12, 12], { unit: "kg" }), preferences),
    null,
  );
});

test("progression keeps same-unit history in the window, oldest first", () => {
  const window = progressionWindow("2026-11-25");
  const sessions = [
    session([12, 12, 12], {
      weight: "85",
      date: "2026-11-24",
      completedAt: "2026-11-24T10:00:00Z",
    }),
    session([10, 10, 10], {
      weight: "80",
      date: "2026-10-28",
      completedAt: "2026-10-28T10:00:00Z",
    }),
    session([10, 10, 10], {
      weight: "75",
      date: "2026-11-05",
      completedAt: "2026-11-05T10:00:00Z",
      unit: "kg",
    }),
    session([10, 10, 10], {
      weight: "82.5",
      date: "2026-11-10",
      completedAt: "2026-11-10T10:00:00Z",
    }),
  ];

  const progression = buildExerciseProgression(sessions, preferences, window);

  assert.equal(progression.status, "ready");
  assert.equal(progression.workingWeight, "85.00");
  assert.equal(progression.lastDate, "2026-11-24");
  assert.equal(progression.suggestedWeight, "90.00");
  assert.deepEqual(progression.weightHistory, [
    { date: "2026-11-10", weight: "82.50" },
    { date: "2026-11-24", weight: "85.00" },
  ]);
});
