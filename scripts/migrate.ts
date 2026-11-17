import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseUrl =
  process.env.MIGRATIONS_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL or MIGRATIONS_DATABASE_URL before running migrations.",
  );
}

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "nuxt", "db", "migrate"],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      POSTGRES_URL: databaseUrl,
      POSTGRESQL_URL: databaseUrl,
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(
    `Database migration failed (exit code ${result.status ?? "unknown"}).`,
  );
}
