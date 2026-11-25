import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import postgres from "postgres";
import {
  ensureAdminUser,
  type AdminConfig,
} from "../../server/utils/admin-bootstrap";
import {
  applyMigrations,
  type MigrationFile,
} from "../../server/utils/db-migrations";
import {
  exerciseImagePaths,
  parseExerciseSeed,
  seedExerciseCatalog,
} from "../../server/utils/exercise-seed";
import { testDatabaseUrl } from "./helpers";

const root = fileURLToPath(new URL("../../", import.meta.url));
const migrationsDir = join(root, "server/db/migrations/postgresql");
const seedPath = join(root, "data/seed/exercises.json");
const muscleImagesDir = join(root, "public/images/muscles");

function readMigrations(): MigrationFile[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      name: file.replace(/\.sql$/, ""),
      sql: readFileSync(join(migrationsDir, file), "utf8"),
    }));
}

async function isolatedDatabase() {
  const name = `lift_ledger_test_startup_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(testDatabaseUrl());
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const admin = postgres(adminUrl.toString(), { max: 1 });
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  await admin.end();

  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 1 });

  return {
    client,
    async cleanup() {
      await client.end();
      const drop = postgres(adminUrl.toString(), { max: 1 });
      await drop.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
      await drop.end();
    },
  };
}

test("exercise seed images exist under public/", () => {
  const dataset = parseExerciseSeed(readFileSync(seedPath, "utf8"));
  for (const publicPath of exerciseImagePaths(dataset)) {
    assert.ok(
      existsSync(join(root, "public", publicPath.slice(1))),
      `missing ${publicPath}`,
    );
  }
});

test("migrations apply once and are skipped on the next run", async () => {
  const { client, cleanup } = await isolatedDatabase();
  try {
    const migrations = readMigrations();
    const first = await applyMigrations(client, migrations);
    assert.deepEqual(
      first,
      migrations.map((migration) => migration.name),
    );

    const second = await applyMigrations(client, migrations);
    assert.deepEqual(second, []);
  } finally {
    await cleanup();
  }
});

test("a failing migration is rolled back and not recorded", async () => {
  const { client, cleanup } = await isolatedDatabase();
  try {
    await assert.rejects(
      applyMigrations(client, [
        { name: "0001_ok", sql: "CREATE TABLE ok_table (id integer)" },
        {
          name: "0002_bad",
          sql: "CREATE TABLE partial_table (id integer)\n--> statement-breakpoint\nSELECT * FROM missing_table",
        },
      ]),
    );

    const [{ created }] = await client`
      SELECT to_regclass('partial_table') IS NOT NULL AS created
    `;
    assert.equal(created, false);

    const recorded = await client<{ name: string }[]>`
      SELECT name FROM _hub_migrations ORDER BY name
    `;
    assert.deepEqual(
      recorded.map((row) => row.name),
      ["0001_ok"],
    );
  } finally {
    await cleanup();
  }
});

test("exercise catalog seeds, skips when unchanged, and reseeds when forced", async () => {
  const { client, cleanup } = await isolatedDatabase();
  try {
    await applyMigrations(client, readMigrations());
    const raw = readFileSync(seedPath, "utf8");
    const muscleImageFiles = new Set(readdirSync(muscleImagesDir));

    const first = await seedExerciseCatalog(client, raw, { muscleImageFiles });
    assert.equal(first.status, "seeded");
    assert.equal(first.exercises, parseExerciseSeed(raw).exercises.length);

    const second = await seedExerciseCatalog(client, raw, { muscleImageFiles });
    assert.equal(second.status, "unchanged");

    const forced = await seedExerciseCatalog(client, raw, {
      muscleImageFiles,
      force: true,
    });
    assert.equal(forced.status, "seeded");

    const [{ count }] = await client<{ count: number }[]>`
      SELECT count(*)::int AS count FROM exercises
    `;
    assert.equal(count, first.exercises);
  } finally {
    await cleanup();
  }
});

test("admin bootstrap creates, keeps, promotes, and refuses accounts correctly", async () => {
  const { client, cleanup } = await isolatedDatabase();
  try {
    await applyMigrations(client, readMigrations());

    const emailConfig: AdminConfig = {
      name: "Site Administrator",
      email: "admin@example.test",
      password: "correct-horse-battery",
      authMode: "email-password",
      socialProviderIds: [],
    };
    const created: string[] = [];
    const createUser = async ({ email }: { email: string }) => {
      created.push(email);
      await client`
        INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${randomUUID()}, 'Admin', ${email}, true, 'admin')
      `;
    };

    assert.equal(
      await ensureAdminUser(client, emailConfig, createUser),
      "created",
    );
    assert.equal(
      await ensureAdminUser(client, emailConfig, createUser),
      "exists",
    );
    assert.deepEqual(created, ["admin@example.test"]);

    const memberId = randomUUID();
    await client`
      INSERT INTO "user" (id, name, email, email_verified, role)
      VALUES (${memberId}, 'Member', 'member@example.test', true, 'user')
    `;
    await assert.rejects(
      ensureAdminUser(
        client,
        { ...emailConfig, email: "member@example.test" },
        createUser,
      ),
      /non-admin user already exists/,
    );

    const socialId = randomUUID();
    await client`
      INSERT INTO "user" (id, name, email, email_verified)
      VALUES (${socialId}, 'Social', 'social@example.test', true)
    `;
    await client`
      INSERT INTO "account" (id, account_id, provider_id, user_id, updated_at)
      VALUES (${randomUUID()}, 'gh-1', 'github', ${socialId}, now())
    `;
    const socialConfig: AdminConfig = {
      name: "Social Admin",
      email: "social@example.test",
      authMode: "social-only",
      socialProviderIds: ["github"],
    };
    assert.equal(
      await ensureAdminUser(client, socialConfig, createUser),
      "promoted",
    );
    assert.equal(created.length, 1);
  } finally {
    await cleanup();
  }
});
