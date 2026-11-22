import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  heatmapCells,
  heatmapWindow,
  mondayOf,
} from "../shared/activity/heatmap";
import { activityQuerySchema } from "../shared/validation/workouts";

function weekday(value: string) {
  return new Date(`${value}T00:00:00Z`).getUTCDay();
}

test("weeks start on Monday for Sunday, Monday, and mid-week dates", () => {
  assert.equal(mondayOf("2026-11-22"), "2026-11-16");
  assert.equal(mondayOf("2026-11-23"), "2026-11-23");
  assert.equal(mondayOf("2026-11-20"), "2026-11-16");
});

test("the window is 52 Monday-to-Sunday weeks ending in the current week", () => {
  for (const today of ["2026-11-22", "2026-11-23", "2024-03-01"]) {
    const { start, end } = heatmapWindow(today);
    const cells = heatmapCells(today, []);

    assert.equal(weekday(start), 1, `start is a Monday for ${today}`);
    assert.equal(weekday(end), 0, `end is a Sunday for ${today}`);
    assert.equal(cells.length, 52 * 7);
    assert.equal(cells[0].date, start);
    assert.equal(cells.at(-1)?.date, end);
    assert.ok(cells.some((cell) => cell.date === today));
  }
});

test("the window starts 357 days before the current week's Monday", () => {
  assert.equal(heatmapWindow("2026-11-23").start, "2025-12-01");
  assert.equal(heatmapWindow("2026-11-22").start, "2025-11-24");
  assert.equal(heatmapWindow("2026-11-22").end, "2026-11-22");
});

test("the window crosses a leap day correctly", () => {
  const { start, end } = heatmapWindow("2024-03-01");
  assert.equal(weekday(start), 1);
  assert.equal(addDays(start, 364), addDays(end, 1));
});

test("cells are active only for the given dates", () => {
  const cells = heatmapCells("2026-11-20", ["2026-11-20", "2025-11-24"]);
  const active = cells.filter((cell) => cell.active).map((cell) => cell.date);

  assert.deepEqual(active, ["2025-11-24", "2026-11-20"]);
});

test("the activity query accepts real dates and rejects everything else", () => {
  assert.equal(
    activityQuerySchema.safeParse({ today: "2026-11-20" }).success,
    true,
  );
  assert.equal(
    activityQuerySchema.safeParse({ today: "2024-02-29" }).success,
    true,
  );
  assert.equal(
    activityQuerySchema.safeParse({ today: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    activityQuerySchema.safeParse({ today: "2026/11/20" }).success,
    false,
  );
  assert.equal(activityQuerySchema.safeParse({ today: "" }).success, false);
  assert.equal(activityQuerySchema.safeParse({}).success, false);
});
