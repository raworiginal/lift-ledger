import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import type postgres from "postgres";
import { DEFAULT_TRAINING_PREFERENCES } from "../../shared/progression/preferences";
import { trainingPreferences } from "../../server/db/schema/training-preferences";
import {
  getTrainingPreferences,
  saveTrainingPreferences,
} from "../../server/utils/preferences";
import type { WorkoutDb } from "../../server/utils/workouts";
import { createUser, deleteUser, openTestDatabase } from "./helpers";

let client: ReturnType<typeof postgres>;
let db: WorkoutDb;
const users: string[] = [];

before(async () => {
  const opened = await openTestDatabase();
  client = opened.client;
  db = opened.db;
});

after(async () => {
  for (const id of users) await deleteUser(db, id);
  await client.end();
});

async function newUser() {
  const id = await createUser(db);
  users.push(id);
  return id;
}

test("GET returns defaults when no row exists", async () => {
  const userId = await newUser();

  const preferences = await getTrainingPreferences(db, userId);

  assert.deepEqual(preferences, DEFAULT_TRAINING_PREFERENCES);
});

test("the first save inserts a row and a second save updates it", async () => {
  const userId = await newUser();

  const inserted = await saveTrainingPreferences(db, userId, {
    repMin: 6,
    repMax: 10,
    unit: "kg",
    weightStep: "2.50",
    restTimeSeconds: 90,
  });
  assert.deepEqual(inserted, {
    repMin: 6,
    repMax: 10,
    unit: "kg",
    weightStep: "2.50",
    restTimeSeconds: 90,
  });

  const updated = await saveTrainingPreferences(db, userId, {
    repMin: 5,
    repMax: 15,
    unit: "lb",
    weightStep: "10",
    restTimeSeconds: 180,
  });
  assert.equal(updated.repMin, 5);

  const rows = await db
    .select()
    .from(trainingPreferences)
    .where(eq(trainingPreferences.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.repMax, 15);
  assert.equal(rows[0]?.unit, "lb");
  assert.equal(rows[0]?.restTimeSeconds, 180);

  assert.deepEqual(await getTrainingPreferences(db, userId), updated);
});

test("users cannot read or change each other's preferences", async () => {
  const owner = await newUser();
  const other = await newUser();

  await saveTrainingPreferences(db, owner, {
    repMin: 4,
    repMax: 6,
    unit: "kg",
    weightStep: "1.25",
    restTimeSeconds: 60,
  });

  assert.deepEqual(
    await getTrainingPreferences(db, other),
    DEFAULT_TRAINING_PREFERENCES,
  );

  await saveTrainingPreferences(db, other, {
    repMin: 12,
    repMax: 20,
    unit: "lb",
    weightStep: "2.5",
    restTimeSeconds: 150,
  });

  assert.deepEqual(await getTrainingPreferences(db, owner), {
    repMin: 4,
    repMax: 6,
    unit: "kg",
    weightStep: "1.25",
    restTimeSeconds: 60,
  });
});

test("deleting the user removes the preferences row", async () => {
  const userId = await newUser();
  await saveTrainingPreferences(db, userId, {
    repMin: 8,
    repMax: 12,
    unit: "lb",
    weightStep: "5",
    restTimeSeconds: 120,
  });

  await deleteUser(db, userId);
  users.splice(users.indexOf(userId), 1);

  const rows = await db
    .select()
    .from(trainingPreferences)
    .where(eq(trainingPreferences.userId, userId));
  assert.equal(rows.length, 0);
});
