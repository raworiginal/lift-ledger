import type { MigrationFile } from "./db-migrations";

function bundledStorage() {
  return useStorage("assets:");
}

async function readText(key: string): Promise<string> {
  const value = await bundledStorage().getItem<unknown>(key);
  if (value === null || value === undefined) {
    throw new Error(`Bundled asset ${key} is missing from the server build.`);
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function readBundledMigrations(): Promise<MigrationFile[]> {
  const keys = (await bundledStorage().getKeys("migrations:"))
    .filter((key) => key.endsWith(".sql"))
    .sort();

  if (keys.length === 0) {
    throw new Error(
      "No database migrations are bundled with the server build.",
    );
  }

  return Promise.all(
    keys.map(async (key) => ({
      name: key.replace(/^migrations:/, "").replace(/\.sql$/, ""),
      sql: await readText(key),
    })),
  );
}

export function readBundledExerciseSeed(): Promise<string> {
  return readText("seed:exercises.json");
}

export async function readBundledMuscleImageFiles(): Promise<Set<string>> {
  const keys = await bundledStorage().getKeys("muscle-images:");
  return new Set(keys.map((key) => key.replace(/^muscle-images:/, "")));
}
