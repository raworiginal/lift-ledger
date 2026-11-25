import "dotenv/config";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  ensureAdminUser,
  readAdminConfig,
} from "../server/utils/admin-bootstrap";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set.`);
  }
  return value;
}

function requiredAuthSecret(): string {
  const secret =
    process.env.NUXT_BETTER_AUTH_SECRET?.trim() ||
    process.env.NUXT_APP_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Set NUXT_BETTER_AUTH_SECRET, NUXT_APP_SECRET, or the legacy BETTER_AUTH_SECRET.",
    );
  }

  return secret;
}

function loadSetupConfig() {
  return {
    databaseUrl:
      process.env.MIGRATIONS_DATABASE_URL?.trim() ||
      requiredEnv("DATABASE_URL"),
    secret: requiredAuthSecret(),
    baseURL:
      process.env.NUXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
    admin: readAdminConfig(process.env),
  };
}

function runCommand(args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args,
    { cwd: projectRoot, env, stdio: "inherit" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Command pnpm ${args.join(" ")} failed (exit code ${result.status ?? "unknown"}).`,
    );
  }
}

async function main() {
  const config = loadSetupConfig();
  if (config.secret.length < 32) {
    throw new Error(
      "The Better Auth secret must be at least 32 characters long.",
    );
  }

  console.info("Preparing Nuxt and generating the Better Auth schema...");
  runCommand(["exec", "nuxt", "prepare"]);

  console.info("Applying project database migrations...");
  runCommand(["db:migrate"], {
    ...process.env,
    DATABASE_URL: config.databaseUrl,
    POSTGRES_URL: config.databaseUrl,
    POSTGRESQL_URL: config.databaseUrl,
  });

  const authSchemaPath = join(
    projectRoot,
    ".nuxt/better-auth/schema.postgresql.mjs",
  );
  const authSchema = await import(pathToFileURL(authSchemaPath).href);

  const client = postgres(config.databaseUrl, { max: 1 });
  try {
    const db = drizzle({ client, schema: authSchema });
    const auth = betterAuth({
      secret: config.secret,
      baseURL: config.baseURL,
      emailAndPassword: { enabled: config.admin.authMode === "email-password" },
      rateLimit: { enabled: true, storage: "database" },
      database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
      plugins: [admin()],
    });

    const result = await ensureAdminUser(
      client,
      config.admin,
      async ({ email, password, name }) => {
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

    const messages = {
      exists: `Admin ${config.admin.email} already exists; leaving it unchanged.`,
      promoted: `Promoted existing OAuth user ${config.admin.email} to admin.`,
      created: `Created initial admin user ${config.admin.email}.`,
    };
    console.info(messages[result]);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Nuxt Auth Layer setup failed: ${message}`);
  process.exitCode = 1;
});
