type Auth = {
  $context: Promise<{
    internalAdapter: {
      findUserByEmail(email: string): Promise<{ user: { id: string; role?: string } } | null>;
      updateUser(userId: string, data: Record<string, unknown>): Promise<unknown>;
    };
  }>;
  api: {
    createUser(input: unknown): Promise<unknown>;
  };
};

export async function bootstrapAdmin(
  auth: Auth,
  env: Record<string, string | undefined>,
): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const { internalAdapter } = await auth.$context;
  const result = await internalAdapter.findUserByEmail(email);
  const user = result?.user;

  if (user) {
    if (user.role !== "admin") await internalAdapter.updateUser(user.id, { role: "admin" });
    return;
  }

  await auth.api.createUser({
    body: {
      name: env.ADMIN_NAME || email,
      email,
      password,
      role: "admin",
    },
  });
}
