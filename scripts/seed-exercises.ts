import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  exerciseImagePaths,
  parseExerciseSeed,
  seedExerciseCatalog,
} from "../server/utils/exercise-seed";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const seedPath = join(projectRoot, "data/seed/exercises.json");
const publicRoot = join(projectRoot, "public");
const muscleImagesRoot = join(publicRoot, "images", "muscles");

function verifyExerciseAssets(raw: string) {
  for (const publicPath of exerciseImagePaths(parseExerciseSeed(raw))) {
    const diskPath = join(publicRoot, publicPath.slice(1));
    if (!existsSync(diskPath)) {
      throw new Error(`Missing exercise image: ${diskPath}`);
    }
  }
}

async function main() {
  const raw = readFileSync(seedPath, "utf8");
  verifyExerciseAssets(raw);

  const databaseUrl =
    process.env.MIGRATIONS_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL or MIGRATIONS_DATABASE_URL before seeding exercises.",
    );
  }

  const client = postgres(databaseUrl, { max: 1 });
  try {
    const result = await seedExerciseCatalog(client, raw, {
      muscleImageFiles: new Set(readdirSync(muscleImagesRoot)),
      force: true,
    });
    console.info(
      `Seeded ${result.exercises} exercises, ${result.muscles} muscles, and ${result.links} exercise-muscle links.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
