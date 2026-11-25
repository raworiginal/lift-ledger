import type postgres from "postgres";

export type AuthMode = "email-password" | "social-only";

export type AdminConfig = {
  name: string;
  email: string;
  password?: string;
  authMode: AuthMode;
  socialProviderIds: string[];
};

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set.`);
  }
  return value;
}

export function readAdminConfig(env: NodeJS.ProcessEnv): AdminConfig {
  const email = requiredEnv(env, "ADMIN_EMAIL").toLowerCase();
  const authMode = env.NUXT_PUBLIC_AUTH_MODE?.trim() || "email-password";
  if (authMode !== "email-password" && authMode !== "social-only") {
    throw new Error(
      'NUXT_PUBLIC_AUTH_MODE must be either "email-password" or "social-only".',
    );
  }

  const socialProviderIds: string[] = [];
  for (const provider of ["google", "github"] as const) {
    const providerName = provider.toUpperCase();
    const clientId = env[`NUXT_${providerName}_CLIENT_ID`]?.trim();
    const clientSecret = env[`NUXT_${providerName}_CLIENT_SECRET`]?.trim();
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
    password = env.ADMIN_PASSWORD;
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
    name: requiredEnv(env, "ADMIN_NAME"),
    email,
    password,
    authMode,
    socialProviderIds,
  };
}

export async function ensureAdminUser(
  client: postgres.Sql,
  config: AdminConfig,
  createUser: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>,
): Promise<"exists" | "promoted" | "created"> {
  const [existing] = await client<
    { id: string; role: string | null; email_verified: boolean }[]
  >`SELECT id, role, email_verified FROM "user" WHERE email = ${config.email} LIMIT 1`;

  if (existing) {
    if (existing.role === "admin") return "exists";

    if (config.authMode === "social-only") {
      const accounts = await client<{ provider_id: string }[]>`
        SELECT provider_id FROM "account" WHERE user_id = ${existing.id}
      `;
      if (
        !existing.email_verified ||
        !accounts.some(({ provider_id }) =>
          config.socialProviderIds.includes(provider_id),
        )
      ) {
        throw new Error(
          `Existing user ${config.email} has no verified account from a configured social provider; no changes were made.`,
        );
      }
      await client`UPDATE "user" SET role = 'admin' WHERE id = ${existing.id}`;
      return "promoted";
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

  await createUser({
    email: config.email,
    password: config.password!,
    name: config.name,
  });
  return "created";
}
