import assert from "node:assert/strict";
import test from "node:test";
import {
  assistanceToStored,
  isAssistedExercise,
  storedToEntry,
  weightFitsExercise,
} from "../shared/exercises/assisted";

test("assisted is recognised as a whole word, ignoring case", () => {
  assert.equal(isAssistedExercise("Machine Assisted Dips"), true);
  assert.equal(isAssistedExercise("assisted pull ups"), true);
  assert.equal(isAssistedExercise("Band Assisted Pull Ups"), true);
});

test("names without the whole word assisted are not assisted", () => {
  assert.equal(isAssistedExercise("Unassisted Pull Ups"), false);
  assert.equal(isAssistedExercise("Assistedly Walking"), false);
  assert.equal(isAssistedExercise("Bench Press"), false);
});

test("assisted exercises accept zero or negative weights only", () => {
  assert.equal(weightFitsExercise("-20.00", true), true);
  assert.equal(weightFitsExercise("0.00", true), true);
  assert.equal(weightFitsExercise("5.00", true), false);
});

test("other exercises accept zero or positive weights only", () => {
  assert.equal(weightFitsExercise("20.00", false), true);
  assert.equal(weightFitsExercise("0.00", false), true);
  assert.equal(weightFitsExercise("-5.00", false), false);
});

test("assistance entered as a positive number is stored as negative", () => {
  assert.equal(assistanceToStored("20", true), "-20");
  assert.equal(assistanceToStored("2.5", true), "-2.5");
});

test("zero assistance is stored as zero, not negative zero", () => {
  assert.equal(assistanceToStored("0", true), "0");
  assert.equal(assistanceToStored("0.00", true), "0.00");
});

test("other exercises store entries unchanged", () => {
  assert.equal(assistanceToStored("135", false), "135");
});

test("stored assistance reads back as a positive entry", () => {
  assert.equal(storedToEntry("-20.00", true), "20");
  assert.equal(storedToEntry("0.00", true), "0");
  assert.equal(storedToEntry("135.50", false), "135.5");
});
