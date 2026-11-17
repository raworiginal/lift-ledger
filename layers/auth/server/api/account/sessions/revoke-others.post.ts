import { assertSameOriginAdminRequest as assertSameOriginJsonRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginJsonRequest(event);
  const { user } = await requireUserSession(event);
  await enforceCustomApiRateLimit(event, user.id, "account");

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(name, value);
  }
  return await serverAuth().api.revokeOtherSessions({
    headers,
  });
});
