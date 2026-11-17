import "dotenv/config";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const authMode =
    process.env.NUXT_PUBLIC_AUTH_MODE?.trim() || "email-password";
  if (authMode !== "email-password" && authMode !== "social-only") {
    throw new Error(
      'NUXT_PUBLIC_AUTH_MODE must be either "email-password" or "social-only".',
    );
  }

  const socialProviderIds: string[] = [];
  for (const provider of ["google", "github"] as const) {
    const providerName = provider.toUpperCase();
    const clientId = process.env[`NUXT_${providerName}_CLIENT_ID`]?.trim();
    const clientSecret =
      process.env[`NUXT_${providerName}_CLIENT_SECRET`]?.trim();
    if (Boolean(clientId) !== Boolean(clientSecret)) {
      throw new Error(
        `Both NUXT_${providerName}_CLIENT_ID and NUXT_${providerName}_CLIENT_SECRET must be configured together.`,
      );
    }
    if (clientId && clientSecret) socialProviderIds.push(provider);
  }
  if (authMode === "social-only" && socialProviderIds.length === 0) {
    throw new Error(
      "Social-only authentication requires at least one configured social provider.",
    );
  }

  let password: string | undefined;
  if (authMode === "email-password") {
    password = process.env.ADMIN_PASSWORD;
    if (!password) {
      throw new Error(
        "Required environment variable ADMIN_PASSWORD is not set.",
      );
    }
    if (password.length < 12) {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
    }
  }

  return {
    databaseUrl:
      process.env.MIGRATIONS_DATABASE_URL?.trim() ||
      requiredEnv("DATABASE_URL"),
    secret: requiredAuthSecret(),
    name: requiredEnv("ADMIN_NAME"),
    email,
    password,
    authMode,
    socialProviderIds,
    baseURL:
      process.env.NUXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
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
    const [existingUser] = await db
      .select({
        id: authSchema.user.id,
        role: authSchema.user.role,
        emailVerified: authSchema.user.emailVerified,
      })
      .from(authSchema.user)
      .where(eq(authSchema.user.email, config.email))
      .limit(1);

    if (existingUser) {
      if (existingUser.role === "admin") {
        console.info(
          `Admin ${config.email} already exists; leaving it unchanged.`,
        );
        return;
      }
      if (config.authMode === "social-only") {
        const accounts = await db
          .select({ providerId: authSchema.account.providerId })
          .from(authSchema.account)
          .where(eq(authSchema.account.userId, existingUser.id));
        if (
          !existingUser.emailVerified ||
          !accounts.some(({ providerId }) =>
            config.socialProviderIds.includes(providerId),
          )
        ) {
          throw new Error(
            `Existing user ${config.email} has no verified account from a configured social provider; no changes were made.`,
          );
        }
        await db
          .update(authSchema.user)
          .set({ role: "admin" })
          .where(eq(authSchema.user.id, existingUser.id));
        console.info(`Promoted existing OAuth user ${config.email} to admin.`);
        return;
      }
      throw new Error(
        `A non-admin user already exists for ${config.email}; no account changes were made. Promote it manually if appropriate.`,
      );
    }

    if (config.authMode === "social-only") {
      throw new Error(
        `No account exists for ${config.email}. Register by signing in with a configured social provider, then rerun pnpm auth:setup to promote that verified OAuth account.`,
      );
    }

    const auth = betterAuth({
      secret: config.secret,
      baseURL: config.baseURL,
      emailAndPassword: { enabled: config.authMode === "email-password" },
      rateLimit: { enabled: true, storage: "database" },
      database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
      plugins: [admin()],
    });

    const result = await auth.api.createUser({
      body: {
        email: config.email,
        password: config.password!,
        name: config.name,
        role: "admin",
        data: { emailVerified: true },
      },
    });

    console.info(`Created initial admin user ${result.user.email}.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Nuxt Auth Layer setup failed: ${message}`);
  process.exitCode = 1;
});
