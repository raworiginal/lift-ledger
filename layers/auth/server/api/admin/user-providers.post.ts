import { inArray } from "drizzle-orm";
import {
  listAdminUserProvidersResultSchema,
  listAdminUserProvidersSchema,
} from "#shared/auth/schemas/admin";
import { db } from "@nuxthub/db";
import { account } from "#auth/schema";
import { assertSameOriginAdminRequest } from "#layers/auth/server/utils/admin-request";
import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  assertSameOriginAdminRequest(event);
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  await enforceCustomApiRateLimit(event, user.id, "admin");

  const parsed = listAdminUserProvidersSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid list of users is required.",
    });
  }
  const userIds = [...new Set(parsed.data.userIds)];
  const providersByUserId = Object.fromEntries(
    userIds.map((userId) => [userId, [] as string[]]),
  );
  const accounts = await db
    .select({ userId: account.userId, providerId: account.providerId })
    .from(account)
    .where(inArray(account.userId, userIds));

  for (const linkedAccount of accounts) {
    const providers = providersByUserId[linkedAccount.userId];
    if (providers && !providers.includes(linkedAccount.providerId)) {
      providers.push(linkedAccount.providerId);
    }
  }

  for (const providers of Object.values(providersByUserId)) {
    providers.sort();
  }

  return listAdminUserProvidersResultSchema.parse({ providersByUserId });
});
