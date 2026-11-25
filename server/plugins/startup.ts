import postgres from "postgres";
import {
  readBundledExerciseSeed,
  readBundledMigrations,
  readBundledMuscleImageFiles,
} from "../utils/bundled-assets";
import { ensureAdminUser, readAdminConfig } from "../utils/admin-bootstrap";
import { applyMigrations } from "../utils/db-migrations";
import { seedExerciseCatalog } from "../utils/exercise-seed";
import { setStartupTasks } from "../utils/startup-gate";
import { readSiteUrl } from "../utils/site-url";

const LOCK_SQL = "SELECT pg_advisory_lock(hashtext('lift-ledger-startup'))";
const UNLOCK_SQL = "SELECT pg_advisory_unlock(hashtext('lift-ledger-startup'))";

async function runStartupTasks(databaseUrl: string | undefined) {
  readSiteUrl(process.env);
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL before enabling startup tasks.");
  }

  const admin = process.env.ADMIN_EMAIL?.trim()
    ? readAdminConfig(process.env)
    : undefined;

  const client = postgres(databaseUrl, { max: 1 });
  try {
    await client.unsafe(LOCK_SQL);
    try {
      const applied = await applyMigrations(
        client,
        await readBundledMigrations(),
      );
      console.info(
        `[startup] Applied ${applied.length} database migration(s).`,
      );

      const seed = await seedExerciseCatalog(
        client,
        await readBundledExerciseSeed(),
        { muscleImageFiles: await readBundledMuscleImageFiles() },
      );
      console.info(
        `[startup] Exercise catalog ${seed.status} (${seed.exercises} exercises, ${seed.muscles} muscles).`,
      );

      if (admin) {
        const result = await ensureAdminUser(
          client,
          admin,
          async ({ email, password, name }) => {
            // The admin plugin's endpoints are not in the type that ensureServerAuth returns.
            const auth = (await ensureServerAuth()) as unknown as {
              api: {
                createUser: (context: {
                  body: Record<string, unknown>;
                }) => Promise<unknown>;
              };
            };
            await auth.api.createUser({
              body: {
                email,
                password,
                name,
                role: "admin",
                data: { emailVerified: true },
              },
            });
          },
        );
        console.info(`[startup] Admin ${admin.email}: ${result}.`);
      }
    } finally {
      await client.unsafe(UNLOCK_SQL);
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

export default defineNitroPlugin(() => {
  if (process.env.NUXT_RUN_STARTUP_TASKS !== "true") return;

  const databaseUrl =
    process.env.MIGRATIONS_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();

  setStartupTasks(
    runStartupTasks(databaseUrl).catch((error: unknown): void => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[startup] Startup tasks failed: ${message}`);
      process.exit(1);
    }),
  );
});
