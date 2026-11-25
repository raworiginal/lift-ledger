import assert from "node:assert/strict";
import test from "node:test";
import { fromHundredths, toHundredths } from "../shared/progression/weights";

test("toHundredths reads negative weights with the sign on the whole value", () => {
  assert.equal(toHundredths("-1.50"), -150);
  assert.equal(toHundredths("-0.05"), -5);
  assert.equal(toHundredths("-20"), -2000);
  assert.equal(toHundredths("82.5"), 8250);
});

test("toHundredths treats a negative zero as zero", () => {
  assert.equal(toHundredths("-0.00"), 0);
});

test("fromHundredths writes negative weights with two decimals", () => {
  assert.equal(fromHundredths(-150), "-1.50");
  assert.equal(fromHundredths(-5), "-0.05");
  assert.equal(fromHundredths(-2750), "-27.50");
  assert.equal(fromHundredths(0), "0.00");
});

test("negative weights round-trip through hundredths", () => {
  for (const value of ["-0.01", "-2.50", "-99.99", "-100.00"]) {
    assert.equal(fromHundredths(toHundredths(value)), value);
  }
});

test("toHundredths rejects malformed weights", () => {
  assert.throws(() => toHundredths("-"), /Invalid weight/);
  assert.throws(() => toHundredths("1.234"), /Invalid weight/);
});
