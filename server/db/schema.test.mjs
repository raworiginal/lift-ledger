// Run: node --test server/db/schema.test.mjs
// Applies the generated migrations to an in-memory SQLite DB and checks the
// constraints the app relies on actually fire.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const dir = join(import.meta.dirname, "migrations/sqlite");
const db = createClient({ url: ":memory:" });

before(async () => {
  await db.execute("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await db.execute(stmt);
    }
  }
  await db.execute(
    "INSERT INTO user (id, name, email, updatedAt) VALUES ('u1', 'Test', 't@x.io', 0)",
  );
  await db.execute("INSERT INTO exercises (id, name, equipment) VALUES (1, 'Bench Press', 'barbell')");
  await db.execute("INSERT INTO routines (id, user_id, name) VALUES (1, 'u1', 'Push')");
});

test("user.weightUnit defaults to kg", async () => {
  const { rows } = await db.execute("SELECT weightUnit FROM user WHERE id = 'u1'");
  assert.equal(rows[0].weightUnit, "kg");
});

test("exercise names are unique case-insensitively per equipment", async () => {
  await assert.rejects(
    db.execute("INSERT INTO exercises (name, equipment) VALUES ('bench press', 'barbell')"),
    /UNIQUE/,
  );
  await db.execute("INSERT INTO exercises (name, equipment) VALUES ('bench press', 'dumbbell')");
});

test("routine item must have exactly one of movement_pattern / exercise_id", async () => {
  await assert.rejects(
    db.execute("INSERT INTO routine_items (routine_id, position) VALUES (1, 0)"),
    /CHECK/,
  );
  await assert.rejects(
    db.execute(
      "INSERT INTO routine_items (routine_id, position, movement_pattern, exercise_id) VALUES (1, 0, 'horizontal_push', 1)",
    ),
    /CHECK/,
  );
  await db.execute(
    "INSERT INTO routine_items (routine_id, position, movement_pattern) VALUES (1, 0, 'horizontal_push')",
  );
});

test("movement_pattern is restricted to the known list", async () => {
  await assert.rejects(
    db.execute("INSERT INTO exercises (name, equipment, movement_pattern) VALUES ('Curl', 'cable', 'bicep')"),
    /CHECK/,
  );
});

test("exercise referenced by workout history cannot be deleted", async () => {
  await db.execute("INSERT INTO workouts (id, user_id, routine_id, started_at) VALUES (1, 'u1', 1, 0)");
  await db.execute(
    "INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES (1, 1, 1, 0)",
  );
  await db.execute(
    "INSERT INTO workout_sets (workout_exercise_id, position, reps, load) VALUES (1, 0, 5, 60.5)",
  );
  await assert.rejects(db.execute("DELETE FROM exercises WHERE id = 1"), /FOREIGN KEY/);
});

test("deleting a routine keeps the workout, nulls routine_id", async () => {
  await db.execute("DELETE FROM routines WHERE id = 1");
  const { rows } = await db.execute("SELECT routine_id FROM workouts WHERE id = 1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].routine_id, null);
});

test("deleting a workout cascades to exercises and sets", async () => {
  await db.execute("DELETE FROM workouts WHERE id = 1");
  const { rows } = await db.execute("SELECT count(*) AS n FROM workout_sets");
  assert.equal(Number(rows[0].n), 0);
});
