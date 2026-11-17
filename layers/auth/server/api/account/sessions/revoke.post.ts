import { assertSameOriginAdminRequest as assertSameOriginJsonRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginJsonRequest(event);
  const { user } = await requireUserSession(event);
  await enforceCustomApiRateLimit(event, user.id, "account");

  const body: unknown = await readBody(event);
  const sessionId =
    typeof body === "object" && body !== null && "sessionId" in body
      ? body.sessionId
      : undefined;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A session is required.",
    });
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(name, value);
  }
  const sessions = await serverAuth().api.listSessions({ headers });
  const selected = sessions.find((session) => session.id === sessionId);
  if (!selected) {
    throw createError({
      statusCode: 404,
      statusMessage: "The selected session was not found.",
    });
  }

  const current = await getUserSession(event);
  const isCurrentSession = selected.id === current?.session.id;

  await serverAuth().api.revokeSession({
    body: { token: selected.token },
    headers,
  });

  return { current: isCurrentSession };
});
