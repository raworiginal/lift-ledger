import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { user } from "#auth/schema";
import { exercises } from "../../server/db/schema/exercises";
import type { WorkoutDb } from "../../server/utils/workouts";

const migrationsFolder = fileURLToPath(
  new URL("../../server/db/migrations/postgresql", import.meta.url),
);

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set TEST_DATABASE_URL to a dedicated test database.");
  }
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  if (!name.includes("test")) {
    throw new Error(
      `Refusing to run: database "${name}" does not contain "test".`,
    );
  }
  return url;
}

export async function openTestDatabase() {
  const client = postgres(testDatabaseUrl(), { max: 1 });
  const db = drizzle(client) as unknown as WorkoutDb;
  await migrate(db as never, { migrationsFolder });
  return { client, db };
}

export async function createUser(db: WorkoutDb): Promise<string> {
  const id = randomUUID();
  await db.insert(user).values({
    id,
    name: `Test ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
  });
  return id;
}

export async function deleteUser(db: WorkoutDb, id: string) {
  await db.delete(user).where(eq(user.id, id));
}

export async function createExercise(
  db: WorkoutDb,
  nameEn?: string,
): Promise<string> {
  const id = `test-exercise-${randomUUID()}`;
  await db.insert(exercises).values({
    id,
    nameEn: nameEn ?? `Test ${id}`,
    nameDe: `Test ${id}`,
    nameEs: `Test ${id}`,
    descriptionEn: "Test exercise",
    descriptionDe: "Test exercise",
    descriptionEs: "Test exercise",
    category: "strength",
    forceType: "push",
    mechanic: "compound",
    difficulty: "beginner",
    bodyPart: "chest",
    isUnilateral: false,
    isBodyweight: false,
    met: 3,
    goals: [],
    tags: [],
    instructions: { en: [], de: [], es: [] },
    tips: { en: [], de: [], es: [] },
    images: {},
  });
  return id;
}

export async function deleteExercise(db: WorkoutDb, id: string) {
  await db.delete(exercises).where(eq(exercises.id, id));
}
