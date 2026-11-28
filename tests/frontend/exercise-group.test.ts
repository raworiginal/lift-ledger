import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ExerciseGroup from "~/components/workouts/presentational/ExerciseGroup.vue";
import type { WorkoutSet } from "~~/shared/types/workouts";

type Props = InstanceType<typeof ExerciseGroup>["$props"];

const loggedSet: WorkoutSet = {
  id: "set-a",
  exerciseId: "ex-a",
  position: 1,
  setNumber: 1,
  weight: "100",
  reps: 5,
};
const nextLoggedSet: WorkoutSet = {
  id: "set-b",
  exerciseId: "ex-a",
  position: 2,
  setNumber: 2,
  weight: "105",
  reps: 4,
};

function mountGroup(overrides: Partial<Props> = {}) {
  return mountSuspended(ExerciseGroup, {
    props: {
      exerciseId: "ex-a",
      name: "Bench Press",
      sets: [loggedSet, nextLoggedSet],
      unit: "lb",
      lastTime: null,
      editable: true,
      focused: true,
      prefill: { weight: "", reps: "" },
      prefillSourceId: null,
      saveState: "idle",
      editingSetId: null,
      ...overrides,
    },
  });
}

describe("ExerciseGroup", () => {
  it("shows logged sets but hides editing controls without focus", async () => {
    const wrapper = await mountGroup({ focused: false });

    const card = wrapper.get("#exercise-ex-a");
    expect(card.attributes("role")).toBe("button");
    expect(card.attributes("tabindex")).toBe("0");
    const summary = wrapper.get(".exercise-summary");
    expect(summary.text()).toContain("Bench Press");
    expect(summary.text()).toContain("100lb × 5");
    expect(summary.text()).toContain("105lb × 4");
    expect(summary.classes()).toContain("flex-col");
    expect(summary.classes()).toContain("sm:flex-row");
    expect(wrapper.find(".exercise-summary-sets").exists()).toBe(true);
    expect(wrapper.findAll(".exercise-summary-set")).toHaveLength(2);
    expect(wrapper.text()).not.toContain("Edit");
    expect(wrapper.text()).not.toContain("Delete");
    const entryForm = wrapper.get("form");
    expect(
      entryForm.element.closest('div[style*="display: none"]'),
    ).not.toBeNull();

    await summary.trigger("click");
    await card.trigger("keydown", { key: "Enter" });
    await card.trigger("keydown", { key: " " });
    expect(wrapper.emitted("focus")).toHaveLength(3);
  });

  it("keeps set-entry values when focus moves away and back", async () => {
    const wrapper = await mountGroup();
    const weightInput = wrapper.get("input");

    await weightInput.setValue("155");
    await wrapper.setProps({ focused: false });
    expect(wrapper.text()).toContain("100lb × 5");

    await wrapper.setProps({ focused: true });
    expect(wrapper.get("input").element).toHaveProperty("value", "155");
  });

  it("keeps an in-progress set edit while another exercise is focused", async () => {
    const wrapper = await mountGroup({ editingSetId: "set-a" });
    const weightInput = wrapper.get("input");

    await weightInput.setValue("120");
    await wrapper.setProps({ focused: false });
    expect(wrapper.text()).toContain("100lb × 5");
    expect(wrapper.text()).not.toContain("Save edit");

    await wrapper.setProps({ focused: true });
    expect(wrapper.get("input").element).toHaveProperty("value", "120");
  });

  it("shows compact assisted weights as negatives without extra spacing", async () => {
    const wrapper = await mountGroup({
      assisted: true,
      sets: [
        { ...loggedSet, weight: "-25" },
        { ...nextLoggedSet, weight: "0" },
      ],
      focused: false,
    });

    const summary = wrapper.get(".exercise-summary");
    expect(summary.text()).toContain("-25lb × 5");
    expect(summary.text()).toContain("Bodyweight × 4");
    expect(summary.text()).not.toContain("assist");
  });
});
