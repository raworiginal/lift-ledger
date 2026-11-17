import { assertSameOriginAdminRequest as assertSameOriginJsonRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginJsonRequest(event);
  const { user } = await requireUserSession(event);
  await enforceCustomApiRateLimit(event, user.id, "account");

  const body: unknown = await readBody(event);
  const accountId =
    typeof body === "object" && body !== null && "accountId" in body
      ? body.accountId
      : undefined;
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A linked account is required.",
    });
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(name, value);
  }

  // Better Auth verifies account ownership, requires a fresh session, and
  // rejects removing the final linked sign-in method.
  return await serverAuth().api.unlinkAccount({
    body: { accountId },
    headers,
  });
});
