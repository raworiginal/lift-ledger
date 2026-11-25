import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import SetEntryForm from "~/components/workouts/presentational/SetEntryForm.vue";

type Props = InstanceType<typeof SetEntryForm>["$props"];

function mountForm(overrides: Partial<Props> = {}) {
  return mountSuspended(SetEntryForm, {
    props: {
      prefill: { weight: "100", reps: "5" },
      prefillSourceId: "set-1",
      unit: "lb",
      state: "idle",
      ...overrides,
    },
  });
}

function inputs(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  return wrapper.findAll("input");
}

describe("SetEntryForm", () => {
  it("submits trimmed values through an explicit add event", async () => {
    const wrapper = await mountForm({ prefill: { weight: "", reps: "" } });

    await inputs(wrapper)[0]!.setValue(" 135 ");
    await inputs(wrapper)[1]!.setValue(" 8 ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("add")).toEqual([[{ weight: "135", reps: "8" }]]);
  });

  it("stores assistance as a negative weight", async () => {
    const wrapper = await mountForm({
      prefill: { weight: "", reps: "" },
      assisted: true,
    });

    await inputs(wrapper)[0]!.setValue("20");
    await inputs(wrapper)[1]!.setValue("8");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("add")).toEqual([[{ weight: "-20", reps: "8" }]]);
  });

  it("does not accept a typed minus sign for assistance", async () => {
    const wrapper = await mountForm({
      prefill: { weight: "", reps: "" },
      assisted: true,
    });

    await inputs(wrapper)[0]!.setValue("-20");
    await inputs(wrapper)[1]!.setValue("8");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("add")).toBeUndefined();
    expect(wrapper.text()).toContain("Enter a positive number");
  });

  it("shows a prefilled negative weight as positive assistance", async () => {
    const wrapper = await mountForm({
      prefill: { weight: "-25.00", reps: "10" },
      assisted: true,
    });

    expect(inputs(wrapper)[0]!.element.value).toBe("25");
    expect(wrapper.text()).toContain("Assistance (lb)");
  });

  it("does not submit invalid values", async () => {
    const wrapper = await mountForm({ prefill: { weight: "", reps: "" } });

    await inputs(wrapper)[1]!.setValue("1.5");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("add")).toBeUndefined();
  });

  it("keeps typed values while a save is pending", async () => {
    const wrapper = await mountForm();

    await inputs(wrapper)[0]!.setValue("110");
    await wrapper.setProps({ state: "saving" });
    await flushPromises();

    expect(inputs(wrapper)[0]!.element.value).toBe("110");
    expect(wrapper.text()).toContain("Saving…");
  });

  it("keeps values and offers a retry after a failed save", async () => {
    const wrapper = await mountForm();

    await inputs(wrapper)[0]!.setValue("110");
    await wrapper.find("form").trigger("submit");
    await wrapper.setProps({ state: "failed", error: "Network down" });
    await flushPromises();

    expect(inputs(wrapper)[0]!.element.value).toBe("110");
    expect(wrapper.text()).toContain("Network down");
    expect(wrapper.text()).toContain("Retry save");
  });

  it("applies new prefill only while the user has not edited", async () => {
    const wrapper = await mountForm();

    await wrapper.setProps({
      prefill: { weight: "105", reps: "6" },
      prefillSourceId: "set-2",
    });
    await flushPromises();
    expect(inputs(wrapper)[0]!.element.value).toBe("105");

    await inputs(wrapper)[0]!.setValue("200");
    await wrapper.setProps({
      prefill: { weight: "115", reps: "4" },
      prefillSourceId: "set-3",
    });
    await flushPromises();

    expect(inputs(wrapper)[0]!.element.value).toBe("200");
    expect(inputs(wrapper)[1]!.element.value).toBe("6");
  });

  it("clears the edited flag after a save when values are unchanged", async () => {
    const wrapper = await mountForm();

    await wrapper.find("form").trigger("submit");
    await wrapper.setProps({ state: "saved" });
    await wrapper.setProps({
      prefill: { weight: "120", reps: "3" },
      prefillSourceId: "set-4",
    });
    await flushPromises();

    expect(inputs(wrapper)[0]!.element.value).toBe("120");
  });
});
