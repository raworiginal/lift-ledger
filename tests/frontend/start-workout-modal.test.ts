import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import StartWorkoutModal from "~/components/workouts/presentational/StartWorkoutModal.vue";

const today = "2026-11-25";

function mountModal(
  props: Partial<InstanceType<typeof StartWorkoutModal>["$props"]> = {},
) {
  return mountSuspended(StartWorkoutModal, {
    props: {
      open: false,
      defaultDate: today,
      today,
      pending: false,
      defaultUnit: "lb",
      ...props,
    },
    attachTo: document.body,
  });
}

async function submittedUnit(wrapper: Awaited<ReturnType<typeof mountModal>>) {
  const focus = document.body.querySelector<HTMLInputElement>(
    'input[maxlength="60"]',
  );
  focus!.value = "Legs";
  focus!.dispatchEvent(new Event("input"));
  const form = document.body.querySelector("form");
  expect(form).not.toBeNull();
  form!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  await flushPromises();
  return wrapper.emitted("submit")?.at(-1)?.[0];
}

describe("StartWorkoutModal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses defaultUnit for the initial unit", async () => {
    const wrapper = await mountModal({ open: true, defaultUnit: "kg" });

    expect(await submittedUnit(wrapper)).toMatchObject({ unit: "kg" });
  });

  it("resets to defaultUnit each time the modal opens", async () => {
    const wrapper = await mountModal({ open: true, defaultUnit: "kg" });
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ defaultUnit: "lb", open: true });
    await flushPromises();

    expect(await submittedUnit(wrapper)).toMatchObject({ unit: "lb" });
  });
});
