import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  max,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { db as hubDb } from "@nuxthub/db";
import { z } from "zod";
import { exercises } from "../db/schema/exercises";
import { workoutExercises, workouts, workoutSets } from "../db/schema/workouts";
import { numberSetsWithinExercise } from "../../app/utils/workout-sets";
import {
  isAssistedExercise,
  weightFitsExercise,
} from "../../shared/exercises/assisted";
import { localDateSchema } from "../../shared/validation/workouts";
import type {
  CompletedWorkoutPage,
  LastTime,
  WorkoutActivity,
  WorkoutDetail,
  WorkoutExerciseGroup,
  WorkoutSet,
  WorkoutStatus,
  WorkoutSummary,
  WorkoutUnit,
} from "../../shared/types/workouts";

// progressionStatus compares the last three same-unit sessions.
const STALL_LOOKBACK = 3;

export interface RecentExerciseSessionRow {
  exerciseId: string;
  name: string;
  workoutId: string;
  workoutDate: string;
  completedAt: Date;
  unit: WorkoutUnit;
  position: number;
  weight: string;
  reps: number;
}

export type WorkoutDb = typeof hubDb;
type WorkoutTx = Parameters<Parameters<WorkoutDb["transaction"]>[0]>[0];
type Reader = Pick<WorkoutDb, "select">;

export class WorkoutError extends Error {
  readonly statusCode: 400 | 404 | 409 | 422;

  constructor(statusCode: 400 | 404 | 409 | 422, message: string) {
    super(message);
    this.name = "WorkoutError";
    this.statusCode = statusCode;
  }
}

const notFound = () => new WorkoutError(404, "Workout not found.");
const invalidWeightSign = (assisted: boolean) =>
  new WorkoutError(
    422,
    assisted
      ? "Assisted exercises need a weight of zero or less."
      : "Weight cannot be negative for this exercise.",
  );
const statusChanged = () =>
  new WorkoutError(
    409,
    "This workout changed in another tab. Reload to see the latest version.",
  );

// Drizzle drops table qualifiers in select lists, so the outer reference is
// written out in full. Otherwise "id" binds to workout_sets.id and the count is 0.
const setCountSql = sql<number>`(select count(*)::int from ${workoutSets} where ${workoutSets.workoutId} = ${sql.raw('"workouts"."id"')})`;

const summaryColumns = {
  id: workouts.id,
  workoutDate: workouts.workoutDate,
  focus: workouts.focus,
  unit: workouts.unit,
  completedAt: workouts.completedAt,
  setCount: setCountSql,
};

type SummaryRow = {
  id: string;
  workoutDate: string;
  focus: string;
  unit: WorkoutUnit;
  completedAt: Date | null;
  setCount: number;
};

function toSummary(row: SummaryRow): WorkoutSummary {
  return {
    id: row.id,
    workoutDate: row.workoutDate,
    focus: row.focus,
    unit: row.unit,
    status: row.completedAt ? "completed" : "draft",
    completedAt: row.completedAt?.toISOString() ?? null,
    setCount: Number(row.setCount),
  };
}

function ownedWorkout(userId: string, workoutId: string) {
  return and(eq(workouts.id, workoutId), eq(workouts.userId, userId));
}

async function lockOwnedWorkout(
  tx: WorkoutTx,
  userId: string,
  workoutId: string,
  expectedStatus: WorkoutStatus,
) {
  const [row] = await tx
    .select({ id: workouts.id, completedAt: workouts.completedAt })
    .from(workouts)
    .where(ownedWorkout(userId, workoutId))
    .for("update");

  if (!row) throw notFound();

  const actualStatus: WorkoutStatus = row.completedAt ? "completed" : "draft";
  if (actualStatus !== expectedStatus) throw statusChanged();
}

async function loadSummary(
  reader: Reader,
  workoutId: string,
): Promise<WorkoutSummary> {
  const [row] = await reader
    .select(summaryColumns)
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);
  if (!row) throw notFound();
  return toSummary(row);
}

async function loadSets(
  reader: Reader,
  workoutId: string,
  exerciseId?: string,
): Promise<WorkoutSet[]> {
  const rows = await reader
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      position: workoutSets.position,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .where(
      exerciseId
        ? and(
            eq(workoutSets.workoutId, workoutId),
            eq(workoutSets.exerciseId, exerciseId),
          )
        : eq(workoutSets.workoutId, workoutId),
    )
    .orderBy(asc(workoutSets.position));

  return numberSetsWithinExercise(rows).map((set) => ({
    id: set.id,
    exerciseId: set.exerciseId,
    position: set.position,
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
  }));
}

async function getLastTime(
  reader: Reader,
  userId: string,
  exerciseId: string,
  excludeWorkoutId: string,
): Promise<LastTime | null> {
  const [row] = await reader
    .select({
      id: workouts.id,
      workoutDate: workouts.workoutDate,
      unit: workouts.unit,
    })
    .from(workouts)
    .innerJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        ne(workouts.id, excludeWorkoutId),
        eq(workoutSets.exerciseId, exerciseId),
      ),
    )
    .orderBy(
      desc(workouts.workoutDate),
      desc(workouts.completedAt),
      desc(workouts.id),
    )
    .limit(1);

  if (!row) return null;
  return {
    workoutId: row.id,
    workoutDate: row.workoutDate,
    unit: row.unit,
    sets: await loadSets(reader, row.id, exerciseId),
  };
}

async function withLastTime(
  reader: Reader,
  userId: string,
  workoutId: string,
  group: Omit<WorkoutExerciseGroup, "lastTime">,
): Promise<WorkoutExerciseGroup> {
  return {
    ...group,
    lastTime: await getLastTime(reader, userId, group.exerciseId, workoutId),
  };
}

async function loadGroup(
  reader: Reader,
  workoutId: string,
  exerciseId: string,
): Promise<Omit<WorkoutExerciseGroup, "lastTime"> | null> {
  const [row] = await reader
    .select({
      exerciseId: workoutExercises.exerciseId,
      position: workoutExercises.position,
      name: exercises.nameEn,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    ...row,
    assisted: isAssistedExercise(row.name),
    sets: await loadSets(reader, workoutId, exerciseId),
  };
}

const cursorSchema = z.tuple([localDateSchema, z.iso.datetime(), z.uuid()]);

function encodeCursor(row: WorkoutSummary): string {
  return Buffer.from(
    JSON.stringify([row.workoutDate, row.completedAt, row.id]),
  ).toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    const [workoutDate, completedAt, id] = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
    return { workoutDate, completedAt, id };
  } catch {
    throw new WorkoutError(400, "Invalid history cursor.");
  }
}

export async function getDraft(
  db: WorkoutDb,
  userId: string,
): Promise<WorkoutSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNull(workouts.completedAt)))
    .limit(1);
  return row ? toSummary(row) : null;
}

export async function listCompletedWorkouts(
  db: WorkoutDb,
  userId: string,
  opts: { cursor?: string; limit?: number },
): Promise<CompletedWorkoutPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null;

  const rows = await db
    .select(summaryColumns)
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        cursor
          ? sql`(${workouts.workoutDate}, ${workouts.completedAt}, ${workouts.id}) < (${cursor.workoutDate}::date, ${cursor.completedAt}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(
      desc(workouts.workoutDate),
      desc(workouts.completedAt),
      desc(workouts.id),
    )
    .limit(limit + 1);

  const items = rows.slice(0, limit).map(toSummary);
  const last = items.at(-1);
  const hasMore = rows.length > limit;

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

export async function getWorkoutDetail(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
): Promise<WorkoutDetail | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(workouts)
    .where(ownedWorkout(userId, workoutId))
    .limit(1);
  if (!row) return null;

  const groupRows = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      position: workoutExercises.position,
      name: exercises.nameEn,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position));

  const sets = await loadSets(db, workoutId);

  return {
    ...toSummary(row),
    exercises: await Promise.all(
      groupRows.map((group) =>
        withLastTime(db, userId, workoutId, {
          ...group,
          assisted: isAssistedExercise(group.name),
          sets: sets.filter((set) => set.exerciseId === group.exerciseId),
        }),
      ),
    ),
  };
}

export async function listActiveDays(
  db: WorkoutDb,
  userId: string,
  window: { start: string; end: string },
): Promise<WorkoutActivity> {
  const rows = await db
    .selectDistinct({ workoutDate: workouts.workoutDate })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        gte(workouts.workoutDate, window.start),
        lte(workouts.workoutDate, window.end),
      ),
    )
    .orderBy(asc(workouts.workoutDate));

  return { activeDates: rows.map((row) => row.workoutDate) };
}

// Sessions are ranked per exercise and unit so the stall rule's last three
// same-unit sessions are always present, even when they fall before the window.
export async function listRecentExerciseSessions(
  db: WorkoutDb,
  userId: string,
  window: { start: string; end: string },
): Promise<RecentExerciseSessionRow[]> {
  const ranked = db.$with("ranked").as(
    db
      .select({
        exerciseId: workoutSets.exerciseId,
        workoutId: workouts.id,
        workoutDate: workouts.workoutDate,
        completedAt: workouts.completedAt,
        unit: workouts.unit,
        unitRank:
          sql`row_number() over (partition by ${workoutSets.exerciseId}, ${workouts.unit} order by ${workouts.workoutDate} desc, ${workouts.completedAt} desc, ${workouts.id} desc)`.as(
            "unit_rank",
          ),
      })
      .from(workoutSets)
      .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
      .where(
        and(
          eq(workouts.userId, userId),
          isNotNull(workouts.completedAt),
          lte(workouts.workoutDate, window.end),
        ),
      )
      .groupBy(workoutSets.exerciseId, workouts.id),
  );

  const trainedInWindow = db
    .select({ exerciseId: ranked.exerciseId })
    .from(ranked)
    .where(gte(ranked.workoutDate, window.start));

  const rows = await db
    .with(ranked)
    .select({
      exerciseId: ranked.exerciseId,
      name: exercises.nameEn,
      workoutId: ranked.workoutId,
      workoutDate: ranked.workoutDate,
      completedAt: sql<Date>`${ranked.completedAt}`.mapWith(
        workouts.completedAt,
      ),
      unit: ranked.unit,
      position: workoutSets.position,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(ranked)
    .innerJoin(
      workoutSets,
      and(
        eq(workoutSets.workoutId, ranked.workoutId),
        eq(workoutSets.exerciseId, ranked.exerciseId),
      ),
    )
    .innerJoin(exercises, eq(exercises.id, ranked.exerciseId))
    .where(
      and(
        inArray(ranked.exerciseId, trainedInWindow),
        or(
          gte(ranked.workoutDate, window.start),
          lte(ranked.unitRank, STALL_LOOKBACK),
        ),
      ),
    )
    .orderBy(
      desc(ranked.workoutDate),
      desc(ranked.completedAt),
      desc(ranked.workoutId),
      asc(workoutSets.position),
    );

  return rows;
}

export async function startDraft(
  db: WorkoutDb,
  userId: string,
  input: { date: string; focus: string; unit: WorkoutUnit },
): Promise<{ workout: WorkoutSummary; created: boolean }> {
  const inserted = await db
    .insert(workouts)
    .values({
      userId,
      workoutDate: input.date,
      focus: input.focus,
      unit: input.unit,
    })
    .onConflictDoNothing({
      target: workouts.userId,
      where: sql`${workouts.completedAt} is null`,
    })
    .returning({ id: workouts.id });

  if (inserted[0]) {
    return { workout: await loadSummary(db, inserted[0].id), created: true };
  }

  const existing = await getDraft(db, userId);
  if (!existing) throw statusChanged();
  return { workout: existing, created: false };
}

export async function updateWorkout(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  input: {
    date?: string;
    focus?: string;
    unit?: WorkoutUnit;
    expectedStatus: WorkoutStatus;
  },
): Promise<WorkoutSummary> {
  return db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, input.expectedStatus);

    if (input.unit !== undefined) {
      const [current] = await tx
        .select({ unit: workouts.unit })
        .from(workouts)
        .where(eq(workouts.id, workoutId));
      if (current?.unit !== input.unit) {
        const [{ value } = { value: 0 }] = await tx
          .select({ value: count() })
          .from(workoutSets)
          .where(eq(workoutSets.workoutId, workoutId));
        if (value > 0) {
          throw new WorkoutError(
            409,
            "The unit can't change after sets are logged.",
          );
        }
      }
    }

    await tx
      .update(workouts)
      .set({
        ...(input.date !== undefined && { workoutDate: input.date }),
        ...(input.focus !== undefined && { focus: input.focus }),
        ...(input.unit !== undefined && { unit: input.unit }),
        updatedAt: new Date(),
      })
      .where(eq(workouts.id, workoutId));

    return loadSummary(tx, workoutId);
  });
}

export async function deleteWorkout(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  expectedStatus: WorkoutStatus,
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, expectedStatus);
    await tx.delete(workouts).where(eq(workouts.id, workoutId));
  });
}

export async function addExerciseToWorkout(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  input: { exerciseId: string; expectedStatus: WorkoutStatus },
): Promise<{ exercise: WorkoutExerciseGroup; created: boolean }> {
  return db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, input.expectedStatus);

    const existing = await loadGroup(tx, workoutId, input.exerciseId);
    if (existing) {
      return {
        exercise: await withLastTime(tx, userId, workoutId, existing),
        created: false,
      };
    }

    const [catalogRow] = await tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.id, input.exerciseId))
      .limit(1);
    if (!catalogRow) throw new WorkoutError(400, "Unknown exercise.");

    const [{ value } = { value: 0 }] = await tx
      .select({ value: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId));

    await tx.insert(workoutExercises).values({
      workoutId,
      exerciseId: input.exerciseId,
      position: (value ?? 0) + 1,
    });

    const exercise = await loadGroup(tx, workoutId, input.exerciseId);
    if (!exercise) throw notFound();
    return {
      exercise: await withLastTime(tx, userId, workoutId, exercise),
      created: true,
    };
  });
}

export async function removeExerciseFromWorkout(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  input: { exerciseId: string; expectedStatus: WorkoutStatus },
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, input.expectedStatus);

    const group = await loadGroup(tx, workoutId, input.exerciseId);
    if (!group) throw new WorkoutError(404, "Exercise not found in workout.");
    if (group.sets.length > 0) {
      throw new WorkoutError(
        409,
        "Delete the sets before removing this exercise.",
      );
    }

    await tx
      .delete(workoutExercises)
      .where(
        and(
          eq(workoutExercises.workoutId, workoutId),
          eq(workoutExercises.exerciseId, input.exerciseId),
        ),
      );
  });
}

export async function saveSet(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  input: {
    id: string;
    exerciseId: string;
    weight: string;
    reps: string;
    expectedStatus: WorkoutStatus;
  },
): Promise<{ set: WorkoutSet; created: boolean }> {
  return db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, input.expectedStatus);

    const group = await loadGroup(tx, workoutId, input.exerciseId);
    if (!group) throw new WorkoutError(404, "Exercise not found in workout.");
    if (!weightFitsExercise(input.weight, group.assisted)) {
      throw invalidWeightSign(group.assisted);
    }

    const [{ value } = { value: 0 }] = await tx
      .select({ value: max(workoutSets.position) })
      .from(workoutSets)
      .where(eq(workoutSets.workoutId, workoutId));

    const inserted = await tx
      .insert(workoutSets)
      .values({
        id: input.id,
        workoutId,
        exerciseId: input.exerciseId,
        position: (value ?? 0) + 1,
        weight: input.weight,
        reps: Number(input.reps),
      })
      .onConflictDoNothing({ target: workoutSets.id })
      .returning({ id: workoutSets.id });

    if (!inserted[0]) {
      const [existing] = await tx
        .select({ id: workoutSets.id })
        .from(workoutSets)
        .where(
          and(
            eq(workoutSets.id, input.id),
            eq(workoutSets.workoutId, workoutId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new WorkoutError(409, "This set ID is already in use.");
      }
      const sets = await loadSets(tx, workoutId, input.exerciseId);
      const set = sets.find((item) => item.id === existing.id);
      if (!set) throw notFound();
      return { set, created: false };
    }

    const sets = await loadSets(tx, workoutId, input.exerciseId);
    const set = sets.find((item) => item.id === input.id);
    if (!set) throw notFound();
    return { set, created: true };
  });
}

export async function updateSet(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  setId: string,
  input: { weight?: string; reps?: string; expectedStatus: WorkoutStatus },
): Promise<WorkoutSet> {
  return db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, input.expectedStatus);

    const [existing] = await tx
      .select({
        id: workoutSets.id,
        exerciseId: workoutSets.exerciseId,
        name: exercises.nameEn,
      })
      .from(workoutSets)
      .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
      .where(
        and(eq(workoutSets.id, setId), eq(workoutSets.workoutId, workoutId)),
      )
      .limit(1);
    if (!existing) throw new WorkoutError(404, "Set not found.");

    const assisted = isAssistedExercise(existing.name);
    if (
      input.weight !== undefined &&
      !weightFitsExercise(input.weight, assisted)
    ) {
      throw invalidWeightSign(assisted);
    }

    await tx
      .update(workoutSets)
      .set({
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.reps !== undefined && { reps: Number(input.reps) }),
      })
      .where(eq(workoutSets.id, setId));

    const sets = await loadSets(tx, workoutId, existing.exerciseId);
    const set = sets.find((item) => item.id === setId);
    if (!set) throw notFound();
    return set;
  });
}

export async function deleteSet(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
  setId: string,
  expectedStatus: WorkoutStatus,
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockOwnedWorkout(tx, userId, workoutId, expectedStatus);

    const [existing] = await tx
      .select({ id: workoutSets.id })
      .from(workoutSets)
      .where(
        and(eq(workoutSets.id, setId), eq(workoutSets.workoutId, workoutId)),
      )
      .limit(1);
    if (!existing) throw new WorkoutError(404, "Set not found.");

    if (expectedStatus === "completed") {
      const [{ value } = { value: 0 }] = await tx
        .select({ value: count() })
        .from(workoutSets)
        .where(eq(workoutSets.workoutId, workoutId));
      if (value <= 1) {
        throw new WorkoutError(
          409,
          "A completed workout needs at least one set.",
        );
      }
    }

    await tx.delete(workoutSets).where(eq(workoutSets.id, setId));
  });
}

export async function completeWorkout(
  db: WorkoutDb,
  userId: string,
  workoutId: string,
): Promise<WorkoutSummary> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: workouts.id, completedAt: workouts.completedAt })
      .from(workouts)
      .where(ownedWorkout(userId, workoutId))
      .for("update");
    if (!row) throw notFound();

    if (row.completedAt) return loadSummary(tx, workoutId);

    const [{ value } = { value: 0 }] = await tx
      .select({ value: count() })
      .from(workoutSets)
      .where(eq(workoutSets.workoutId, workoutId));
    if (value === 0) {
      throw new WorkoutError(400, "Add at least one set before finishing.");
    }

    const now = new Date();
    await tx
      .update(workouts)
      .set({ completedAt: now, updatedAt: now })
      .where(eq(workouts.id, workoutId));

    return loadSummary(tx, workoutId);
  });
}
