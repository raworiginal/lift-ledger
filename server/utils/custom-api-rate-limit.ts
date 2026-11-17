import { db } from "@nuxthub/db";
import { customApiRateLimit } from "../db/schema/custom-api-rate-limit";
import { buildCustomApiRateLimitUpdate } from "./custom-api-rate-limit-query";
import {
  CUSTOM_API_RATE_LIMITS,
  getCustomApiRateLimitKey,
  getRetryAfterSeconds,
  type CustomApiRouteFamily,
} from "./custom-api-rate-limit-policy";

export async function enforceCustomApiRateLimit(
  event: Parameters<typeof setResponseHeader>[0],
  userId: string,
  routeFamily: CustomApiRouteFamily,
): Promise<void> {
  const policy = CUSTOM_API_RATE_LIMITS[routeFamily];
  const now = new Date();
  const resetBefore = new Date(now.getTime() - policy.windowMs);
  const key = getCustomApiRateLimitKey(userId, routeFamily);

  // A single PostgreSQL upsert serializes concurrent requests for this key.
  // Keep only one row per user/family and cap rejected attempts at max + 1.
  const [result] = await db
    .insert(customApiRateLimit)
    .values({ key, count: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: customApiRateLimit.key,
      set: buildCustomApiRateLimitUpdate(resetBefore, now, policy.maxRequests),
    })
    .returning({
      count: customApiRateLimit.count,
      windowStartedAt: customApiRateLimit.windowStartedAt,
    });

  if (!result || result.count <= policy.maxRequests) return;

  const retryAfter = getRetryAfterSeconds(
    result.windowStartedAt,
    now,
    policy.windowMs,
  );
  setResponseHeader(event, "retry-after", retryAfter);
  throw createError({
    statusCode: 429,
    statusMessage: "Too many requests. Please try again later.",
  });
}
