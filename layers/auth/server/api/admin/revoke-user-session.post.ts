import {
  revokeAdminUserSessionResultSchema,
  selectedAdminUserSessionIdSchema,
} from "#shared/auth/schemas/admin";
import { assertSameOriginAdminRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginAdminRequest(event);
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  await enforceCustomApiRateLimit(event, user.id, "admin");

  const parsed = selectedAdminUserSessionIdSchema.safeParse(
    await readBody(event),
  );
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid user and session are required.",
    });
  }

  const auth = serverAuth();
  const headers = getRequestHeaders(event);
  const authApi = auth.api as typeof auth.api & {
    listUserSessions: (input: {
      body: { userId: string };
      headers: ReturnType<typeof getRequestHeaders>;
    }) => Promise<{ sessions: Array<{ id: string; token: string }> }>;
    revokeUserSession: (input: {
      body: { sessionToken: string };
      headers: ReturnType<typeof getRequestHeaders>;
    }) => Promise<{ success: boolean }>;
  };

  const result = await authApi.listUserSessions({
    body: { userId: parsed.data.userId },
    headers,
  });
  const selectedSession = result.sessions.find(
    (session) => session.id === parsed.data.sessionId,
  );

  if (!selectedSession) {
    throw createError({
      statusCode: 404,
      statusMessage: "The selected session was not found.",
    });
  }

  const revokeResult = await authApi.revokeUserSession({
    body: { sessionToken: selectedSession.token },
    headers,
  });

  return revokeAdminUserSessionResultSchema.parse(revokeResult);
});
