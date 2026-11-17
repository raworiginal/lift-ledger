import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buildCustomApiRateLimitUpdate } from "../server/utils/custom-api-rate-limit-query";
import {
  CUSTOM_API_RATE_LIMITS,
  getCustomApiRateLimitKey,
  getRetryAfterSeconds,
} from "../server/utils/custom-api-rate-limit-policy";

test("custom API limits are scoped to their documented route families", () => {
  assert.deepEqual(CUSTOM_API_RATE_LIMITS, {
    account: { maxRequests: 30, windowMs: 60_000 },
    admin: { maxRequests: 20, windowMs: 60_000 },
  });
});

test("rate-limit keys are stable per user and separated by user and family", () => {
  const accountKey = getCustomApiRateLimitKey("user-123", "account");

  assert.equal(accountKey, getCustomApiRateLimitKey("user-123", "account"));
  assert.notEqual(accountKey, getCustomApiRateLimitKey("user-456", "account"));
  assert.notEqual(accountKey, getCustomApiRateLimitKey("user-123", "admin"));
  assert.equal(accountKey.includes("user-123"), false);
  assert.equal(accountKey.includes("session-token"), false);
});

test("retry-after is rounded up and never less than one second", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");

  assert.equal(
    getRetryAfterSeconds(start, new Date("2026-01-01T00:00:10.001Z"), 60_000),
    50,
  );
  assert.equal(
    getRetryAfterSeconds(start, new Date("2026-01-01T00:01:00.000Z"), 60_000),
    1,
  );
});

test("raw upsert timestamp parameters use Drizzle's PostgreSQL timestamp encoder", () => {
  const resetBefore = new Date("2026-11-13T12:00:00.000Z");
  const now = new Date("2026-11-13T12:01:00.000Z");
  const update = buildCustomApiRateLimitUpdate(resetBefore, now, 30);
  const query = new PgDialect().sqlToQuery(
    sql`select ${update.count}, ${update.windowStartedAt}`,
  );

  assert.equal(
    query.params.some((parameter) => parameter instanceof Date),
    false,
  );
  assert.deepEqual(
    query.params.filter((parameter) => typeof parameter === "string"),
    [resetBefore.toISOString(), resetBefore.toISOString(), now.toISOString()],
  );
});
