import assert from "node:assert/strict";
import test from "node:test";
import { trainingPreferencesSchema } from "../shared/validation/progression";

const valid = {
  repMin: 8,
  repMax: 12,
  unit: "lb",
  weightStep: "5",
  restTimeSeconds: 120,
};

function accepts(value: unknown) {
  return trainingPreferencesSchema.safeParse(value).success;
}

test("training preferences accept a valid range, unit, and step", () => {
  assert.equal(accepts(valid), true);
  assert.equal(accepts({ ...valid, unit: "kg", weightStep: "2.5" }), true);
  assert.equal(accepts({ ...valid, weightStep: "0.01" }), true);
  assert.equal(accepts({ ...valid, repMin: 1, repMax: 100 }), true);
});

test("training preferences reject repMin at or above repMax", () => {
  assert.equal(accepts({ ...valid, repMin: 12, repMax: 12 }), false);
  assert.equal(accepts({ ...valid, repMin: 13, repMax: 12 }), false);
});

test("training preferences reject reps outside 1 to 100", () => {
  assert.equal(accepts({ ...valid, repMin: 0 }), false);
  assert.equal(accepts({ ...valid, repMax: 101 }), false);
});

test("training preferences reject non-integer reps", () => {
  assert.equal(accepts({ ...valid, repMin: 7.5 }), false);
  assert.equal(accepts({ ...valid, repMax: 12.1 }), false);
});

test("training preferences reject a weight step of zero or less", () => {
  assert.equal(accepts({ ...valid, weightStep: "0" }), false);
  assert.equal(accepts({ ...valid, weightStep: "0.00" }), false);
  assert.equal(accepts({ ...valid, weightStep: "-5" }), false);
});

test("training preferences reject weight steps with more than two decimals", () => {
  assert.equal(accepts({ ...valid, weightStep: "2.125" }), false);
});

test("training preferences accept rest times from zero to one hour", () => {
  assert.equal(accepts({ ...valid, restTimeSeconds: 0 }), true);
  assert.equal(accepts({ ...valid, restTimeSeconds: 3600 }), true);
  assert.equal(accepts({ ...valid, restTimeSeconds: -1 }), false);
  assert.equal(accepts({ ...valid, restTimeSeconds: 3601 }), false);
  assert.equal(accepts({ ...valid, restTimeSeconds: 1.5 }), false);
});

test("training preferences reject an unknown unit", () => {
  assert.equal(accepts({ ...valid, unit: "stone" }), false);
});
