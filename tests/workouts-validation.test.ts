import assert from "node:assert/strict";
import test from "node:test";
import {
  focusSchema,
  repsInputSchema,
  unitSchema,
  weightInputSchema,
  workoutDateSchema,
  workoutSetInputSchema,
} from "../shared/validation/workouts";

const today = "2026-11-20";
const dateSchema = workoutDateSchema(today);

test("date rejects values that are not real calendar dates", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2026-02-29").success, false);
  assert.equal(dateSchema.safeParse("not-a-date").success, false);
});

test("date accepts leap days in leap years", () => {
  assert.equal(dateSchema.safeParse("2024-02-29").success, true);
});

test("date rejects future dates and accepts today and past dates", () => {
  assert.equal(dateSchema.safeParse("2026-11-21").success, false);
  assert.equal(dateSchema.safeParse(today).success, true);
  assert.equal(dateSchema.safeParse("2025-01-01").success, true);
});

test("focus is trimmed and required", () => {
  const result = focusSchema.safeParse("  Push  ");

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data, "Push");
  assert.equal(focusSchema.safeParse("").success, false);
  assert.equal(focusSchema.safeParse("   ").success, false);
});

test("focus accepts up to 50 characters and rejects 51", () => {
  assert.equal(focusSchema.safeParse("a".repeat(50)).success, true);
  assert.equal(focusSchema.safeParse("a".repeat(51)).success, false);
});

test("focus accepts a realistic multi-muscle focus", () => {
  assert.equal(
    focusSchema.safeParse("Triceps, Chest, and Shoulders").success,
    true,
  );
});

test("unit accepts kg and lb only", () => {
  assert.equal(unitSchema.safeParse("kg").success, true);
  assert.equal(unitSchema.safeParse("lb").success, true);
  assert.equal(unitSchema.safeParse("stone").success, false);
});

test("weight rejects blank input instead of treating it as zero", () => {
  assert.equal(weightInputSchema.safeParse("").success, false);
  assert.equal(weightInputSchema.safeParse("   ").success, false);
});

test("weight rejects negative values and accepts zero", () => {
  assert.equal(weightInputSchema.safeParse("-5").success, false);
  assert.equal(weightInputSchema.safeParse("0").success, true);
});

test("weight rejects more than two decimal places", () => {
  assert.equal(weightInputSchema.safeParse("10.123").success, false);
  assert.equal(weightInputSchema.safeParse("10.12").success, true);
});

test("weight accepts 9999.99 and rejects 10000", () => {
  assert.equal(weightInputSchema.safeParse("9999.99").success, true);
  assert.equal(weightInputSchema.safeParse("10000").success, false);
});

test("reps rejects fractions and zero", () => {
  assert.equal(repsInputSchema.safeParse("1.5").success, false);
  assert.equal(repsInputSchema.safeParse("0").success, false);
});

test("reps accepts 1 through 100 and rejects 101", () => {
  assert.equal(repsInputSchema.safeParse("12").success, true);
  assert.equal(repsInputSchema.safeParse("1").success, true);
  assert.equal(repsInputSchema.safeParse("100").success, true);
  assert.equal(repsInputSchema.safeParse("101").success, false);
});

test("set input converts validated strings to numbers", () => {
  const result = workoutSetInputSchema.safeParse({
    weight: "135.5",
    reps: "8",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, { weight: 135.5, reps: 8 });
  }
});
