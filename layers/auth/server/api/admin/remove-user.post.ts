import {
  removeAdminUserResultSchema,
  selectedAdminUserIdSchema,
} from "#shared/auth/schemas/admin";
import { assertSameOriginAdminRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginAdminRequest(event);
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  await enforceCustomApiRateLimit(event, user.id, "admin");

  const parsed = selectedAdminUserIdSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid user is required.",
    });
  }

  const auth = serverAuth();
  const removeUser = (
    auth.api as typeof auth.api & {
      removeUser: (input: {
        body: { userId: string };
        headers: ReturnType<typeof getRequestHeaders>;
      }) => Promise<{ success: boolean }>;
    }
  ).removeUser;

  const result = await removeUser({
    body: parsed.data,
    headers: getRequestHeaders(event),
  });

  return removeAdminUserResultSchema.parse(result);
});
