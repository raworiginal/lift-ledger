import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const { user } = await requireUserSession(event);
  await enforceCustomApiRateLimit(event, user.id, "account");
  const current = await getUserSession(event);

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(name, value);
  }
  const sessions = await serverAuth().api.listSessions({
    headers,
  });

  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      userAgent: session.userAgent ?? null,
      current: session.id === current?.session.id,
    })),
  };
});
