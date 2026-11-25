import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import TrainingPreferencesForm from "~/components/workouts/presentational/TrainingPreferencesForm.vue";

type Props = InstanceType<typeof TrainingPreferencesForm>["$props"];

function mountForm(overrides: Partial<Props> = {}) {
  return mountSuspended(TrainingPreferencesForm, {
    props: {
      preferences: { repMin: 8, repMax: 12, unit: "lb", weightStep: "5" },
      saving: false,
      ...overrides,
    },
  });
}

function input(wrapper: Awaited<ReturnType<typeof mountForm>>, name: string) {
  return wrapper.find(`input[name="${name}"]`);
}

async function submit(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

describe("TrainingPreferencesForm", () => {
  it("shows the selected unit in the weight step label", async () => {
    const wrapper = await mountForm();

    expect(wrapper.text()).toContain("Weight step (lb)");
  });

  it("rejects a rep min that is not below rep max", async () => {
    const wrapper = await mountForm();

    await input(wrapper, "repMin").setValue("12");
    await input(wrapper, "repMax").setValue("8");
    await submit(wrapper);

    expect(wrapper.text()).toContain("Rep max must be greater than rep min");
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("rejects a weight step outside the allowed range", async () => {
    const wrapper = await mountForm();

    await input(wrapper, "weightStep").setValue("0");
    await submit(wrapper);

    expect(wrapper.text()).toContain(
      "Weight step must be between 0.01 and 100",
    );
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("emits clean values on a valid submit", async () => {
    const wrapper = await mountForm();

    await input(wrapper, "repMin").setValue("10");
    await input(wrapper, "repMax").setValue("15");
    await input(wrapper, "weightStep").setValue(" 2.5 ");
    await submit(wrapper);

    expect(wrapper.emitted("submit")).toEqual([
      [{ repMin: 10, repMax: 15, unit: "lb", weightStep: "2.5" }],
    ]);
  });
});
