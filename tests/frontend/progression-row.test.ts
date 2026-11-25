import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ProgressionRow from "~/components/workouts/presentational/ProgressionRow.vue";
import type { ExerciseProgression } from "~~/shared/types/workouts";

function item(
  overrides: Partial<ExerciseProgression> = {},
): ExerciseProgression {
  return {
    exerciseId: "ex-1",
    name: "Bench Press",
    unit: "lb",
    assisted: false,
    lastDate: "2026-11-20",
    workingWeight: "80.00",
    reps: [12, 12, 11],
    progress: 0.9,
    status: "building",
    suggestedWeight: null,
    weightHistory: [],
    ...overrides,
  };
}

function mountRow(overrides: Partial<ExerciseProgression> = {}) {
  return mountSuspended(ProgressionRow, { props: { item: item(overrides) } });
}

describe("ProgressionRow", () => {
  it("shows the working weight with one decimal and each set's reps", async () => {
    const wrapper = await mountRow();

    expect(wrapper.text()).toContain("Bench Press");
    expect(wrapper.text()).toContain("80.0 lb · 12 · 12 · 11");
  });

  it("rounds a stored second decimal to one place", async () => {
    const wrapper = await mountRow({ workingWeight: "82.25" });

    expect(wrapper.text()).toContain("82.3 lb");
  });

  it("reads an assisted working weight as assistance", async () => {
    const wrapper = await mountRow({
      name: "Assisted Pull Ups",
      assisted: true,
      workingWeight: "-27.50",
      unit: "kg",
    });

    expect(wrapper.text()).toContain("27.5 kg assist · 12 · 12 · 11");
  });

  it("shows the next assisted weight as assistance when ready", async () => {
    const wrapper = await mountRow({
      name: "Assisted Pull Ups",
      assisted: true,
      status: "ready",
      reps: [12, 12, 12],
      workingWeight: "-30.00",
      suggestedWeight: "-25.00",
    });

    expect(wrapper.text()).toContain("Next: 25.0 lb assist");
  });

  it("says bodyweight is reached for assisted exercises at zero", async () => {
    const wrapper = await mountRow({
      name: "Assisted Dips",
      assisted: true,
      status: "ready",
      reps: [12, 12, 12],
      workingWeight: "0.00",
      suggestedWeight: null,
    });

    expect(wrapper.text()).toContain("Bodyweight reached.");
    expect(wrapper.text()).not.toContain("Add weight");
  });

  it("shows the suggested weight with one decimal when ready", async () => {
    const wrapper = await mountRow({
      status: "ready",
      reps: [12, 12, 12],
      suggestedWeight: "85.00",
    });

    expect(wrapper.text()).toContain("Next: 85.0 lb");
    expect(wrapper.findComponent({ name: "UBadge" }).exists()).toBe(false);
  });

  it("asks for weight when ready without a suggested weight", async () => {
    const wrapper = await mountRow({
      status: "ready",
      reps: [12, 12, 12],
      suggestedWeight: null,
    });

    expect(wrapper.text()).toContain("Add weight");
    expect(wrapper.text()).not.toContain("Next:");
  });

  it("shows the building message", async () => {
    const wrapper = await mountRow({ status: "building" });

    expect(wrapper.text()).toContain("Add reps at this weight.");
  });

  it("shows the below-range message", async () => {
    const wrapper = await mountRow({ status: "below", reps: [7, 8, 8] });

    expect(wrapper.text()).toContain("Below range. Hold or reduce the weight.");
  });

  it("shows the stalled message", async () => {
    const wrapper = await mountRow({ status: "stalled" });

    expect(wrapper.text()).toContain("No progress in 3 sessions.");
  });
});
