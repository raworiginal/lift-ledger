import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ExercisePicker from "~/components/workouts/presentational/ExercisePicker.vue";
import type { ExerciseOption } from "~~/shared/types/workouts";

const results: ExerciseOption[] = [
  { id: "ex-a", name: "Bench Press", equipment: "barbell" },
] as ExerciseOption[];

function mountPicker(
  props: Partial<InstanceType<typeof ExercisePicker>["$props"]>,
) {
  return mountSuspended(ExercisePicker, {
    props: {
      open: true,
      query: "",
      results: [],
      status: "idle",
      ...props,
    },
    attachTo: document.body,
  });
}

function bodyText() {
  return document.body.textContent ?? "";
}

describe("ExercisePicker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a loading state while a search is pending", async () => {
    const wrapper = await mountPicker({ status: "pending" });

    expect(bodyText()).toContain("Searching…");
    expect(bodyText()).not.toContain("could not be searched");
    expect(bodyText()).not.toContain("No exercises match");
    wrapper.unmount();
  });

  it("separates an empty result from a failed search", async () => {
    const wrapper = await mountPicker({ status: "success", results: [] });

    expect(bodyText()).toContain("No exercises match that search.");
    expect(document.querySelector('[role="alert"]')).toBeNull();
    wrapper.unmount();
  });

  it("shows an alert with a retry action when the search fails", async () => {
    const wrapper = await mountPicker({ status: "error", results: [] });

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "could not be searched",
    );
    expect(bodyText()).not.toContain("No exercises match");

    const retry = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Try again"),
    );
    expect(retry).toBeDefined();
    retry!.click();
    expect(wrapper.emitted("retry")).toHaveLength(1);
    wrapper.unmount();
  });

  it("emits the selected exercise id", async () => {
    const wrapper = await mountPicker({ status: "success", results });

    const option = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Bench Press"),
    );
    expect(option).toBeDefined();
    option!.click();
    expect(wrapper.emitted("select")).toEqual([["ex-a"]]);
    wrapper.unmount();
  });
});
