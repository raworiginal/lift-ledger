import {
  revokeAllAdminUserSessionsResultSchema,
  revokeAllAdminUserSessionsSchema,
} from "#shared/auth/schemas/admin";
import { assertSameOriginAdminRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginAdminRequest(event);
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  await enforceCustomApiRateLimit(event, user.id, "admin");

  const parsed = revokeAllAdminUserSessionsSchema.safeParse(
    await readBody(event),
  );
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid user is required.",
    });
  }

  const auth = serverAuth();
  const revokeUserSessions = (
    auth.api as typeof auth.api & {
      revokeUserSessions: (input: {
        body: { userId: string };
        headers: ReturnType<typeof getRequestHeaders>;
      }) => Promise<{ success: boolean }>;
    }
  ).revokeUserSessions;

  const result = await revokeUserSessions({
    body: parsed.data,
    headers: getRequestHeaders(event),
  });

  return revokeAllAdminUserSessionsResultSchema.parse(result);
});
