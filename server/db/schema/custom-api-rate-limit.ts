import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const customApiRateLimit = pgTable("custom_api_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStartedAt: timestamp("window_started_at", {
    withTimezone: true,
  }).notNull(),
});
