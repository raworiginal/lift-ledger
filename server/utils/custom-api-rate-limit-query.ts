import { sql } from "drizzle-orm";
import { customApiRateLimit } from "../db/schema/custom-api-rate-limit";

export function buildCustomApiRateLimitUpdate(
  resetBefore: Date,
  now: Date,
  maxRequests: number,
) {
  const windowStartedAt = customApiRateLimit.windowStartedAt;

  return {
    count: sql`CASE
      WHEN ${windowStartedAt} <= ${sql.param(resetBefore, windowStartedAt)} THEN 1
      WHEN ${customApiRateLimit.count} <= ${maxRequests}
        THEN ${customApiRateLimit.count} + 1
      ELSE ${customApiRateLimit.count}
    END`,
    windowStartedAt: sql`CASE
      WHEN ${windowStartedAt} <= ${sql.param(resetBefore, windowStartedAt)}
        THEN ${sql.param(now, windowStartedAt)}
      ELSE ${windowStartedAt}
    END`,
  };
}
