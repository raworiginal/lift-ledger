import { listAdminUserSessionsSchema } from "#shared/auth/schemas/admin";
import { assertSameOriginAdminRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginAdminRequest(event);
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  await enforceCustomApiRateLimit(event, user.id, "admin");

  const parsed = listAdminUserSessionsSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid user is required.",
    });
  }

  const auth = serverAuth();
  const listUserSessions = (
    auth.api as typeof auth.api & {
      listUserSessions: (input: {
        body: { userId: string };
        headers: ReturnType<typeof getRequestHeaders>;
      }) => Promise<{
        sessions: Array<{ id: string; createdAt: Date; expiresAt: Date }>;
      }>;
    }
  ).listUserSessions;
  const result = await listUserSessions({
    body: parsed.data,
    headers: getRequestHeaders(event),
  });

  return {
    userId: parsed.data.userId,
    sessions: result.sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })),
  };
});
