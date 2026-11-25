import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import type postgres from "postgres";
import { workoutSets } from "../../server/db/schema/workouts";
import {
  addExerciseToWorkout,
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
let userId: string;
const exerciseIds: string[] = [];

before(async () => {
  const opened = await openTestDatabase();
  client = opened.client;
  db = opened.db;
  userId = await createUser(db);
  exerciseIds.push(
    await createExercise(db, `Assisted Dips ${randomUUID()}`),
    await createExercise(db),
  );
});

after(async () => {
  await deleteUser(db, userId);
  for (const id of exerciseIds) await deleteExercise(db, id);
  await client.end();
});

async function flipStatement(): Promise<string> {
  const file = fileURLToPath(
    new URL(
      "../../server/db/migrations/postgresql/0009_dapper_the_fury.sql",
      import.meta.url,
    ),
  );
  const statements = (await readFile(file, "utf8")).split(
    "--> statement-breakpoint",
  );
  const flip = statements.find((statement) =>
    statement.trim().startsWith('UPDATE "workout_sets"'),
  );
  assert.ok(flip, "the migration includes the assisted weight flip");
  return flip;
}

test("the migration flips positive assisted weights and leaves other sets alone", async () => {
  const [assistedId, regularId] = exerciseIds as [string, string];
  const { workout } = await startDraft(db, userId, {
    date: "2026-11-20",
    focus: "Pull",
    unit: "lb",
  });
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: assistedId,
    expectedStatus: "draft",
  });
  await addExerciseToWorkout(db, userId, workout.id, {
    exerciseId: regularId,
    expectedStatus: "draft",
  });

  const rows = [
    { exerciseId: assistedId, weight: "20.00", position: 1 },
    { exerciseId: assistedId, weight: "0.00", position: 2 },
    { exerciseId: regularId, weight: "20.00", position: 3 },
  ].map((row) => ({
    id: randomUUID(),
    workoutId: workout.id,
    reps: 8,
    ...row,
  }));
  await db.insert(workoutSets).values(rows);

  const sql = await flipStatement();
  await client.unsafe(sql);
  await client.unsafe(sql);

  const stored = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, workout.id));
  const weightOf = (id: string) => stored.find((set) => set.id === id)?.weight;

  assert.equal(weightOf(rows[0]!.id), "-20.00");
  assert.equal(weightOf(rows[1]!.id), "0.00");
  assert.equal(weightOf(rows[2]!.id), "20.00");
});
