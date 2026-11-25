import type postgres from "postgres";

export type MigrationFile = { name: string; sql: string };

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export function splitMigrationStatements(sqlText: string): string[] {
  return sqlText
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function applyMigrations(
  client: postgres.Sql,
  migrations: MigrationFile[],
): Promise<string[]> {
  await client.unsafe(
    "CREATE TABLE IF NOT EXISTS _hub_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)",
  );

  const applied = new Set(
    (await client<{ name: string }[]>`SELECT name FROM _hub_migrations`).map(
      (row) => row.name,
    ),
  );

  const newlyApplied: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;

    await client.begin(async (tx) => {
      for (const statement of splitMigrationStatements(migration.sql)) {
        await tx.unsafe(statement);
      }
      await tx`INSERT INTO _hub_migrations (name) VALUES (${migration.name})`;
    });
    newlyApplied.push(migration.name);
  }

  return newlyApplied;
}
