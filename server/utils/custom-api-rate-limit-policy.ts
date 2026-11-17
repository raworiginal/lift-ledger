import { createHash } from "node:crypto";

export type CustomApiRouteFamily = "account" | "admin";

export const CUSTOM_API_RATE_LIMITS = {
  account: { maxRequests: 30, windowMs: 60_000 },
  admin: { maxRequests: 20, windowMs: 60_000 },
} as const satisfies Record<
  CustomApiRouteFamily,
  { maxRequests: number; windowMs: number }
>;

export function getCustomApiRateLimitKey(
  userId: string,
  routeFamily: CustomApiRouteFamily,
): string {
  const userHash = createHash("sha256").update(userId).digest("hex");
  return `custom-api:${routeFamily}:${userHash}`;
}

export function getRetryAfterSeconds(
  windowStartedAt: Date,
  now: Date,
  windowMs: number,
): number {
  return Math.max(
    1,
    Math.ceil((windowStartedAt.getTime() + windowMs - now.getTime()) / 1_000),
  );
}
