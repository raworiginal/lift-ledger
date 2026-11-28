import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import RestTimer from "~/components/workouts/presentational/RestTimer.vue";

function mountTimer(
  props: Partial<InstanceType<typeof RestTimer>["$props"]> = {},
) {
  return mountSuspended(RestTimer, {
    props: { open: true, remainingSeconds: 90, ...props },
    attachTo: document.body,
  });
}

function button(label: string) {
  return [...document.body.querySelectorAll("button")].find(
    (element) =>
      element.textContent?.includes(label) ||
      element.getAttribute("aria-label")?.includes(label),
  );
}

describe("RestTimer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the countdown and offers skip and minimize actions", async () => {
    const wrapper = await mountTimer();

    expect(document.body.textContent).toContain("1:30");
    button("Minimize")?.click();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);

    button("Skip rest")?.click();
    expect(wrapper.emitted("skip")).toHaveLength(1);
    wrapper.unmount();
  });

  it("shows a reopen control while minimized and reports completion", async () => {
    const wrapper = await mountTimer({ open: false, remainingSeconds: 0 });

    expect(document.body.textContent).toContain("Rest complete");
    button("Open rest timer")?.click();
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
    await wrapper.setProps({ open: true });

    button("Done")?.click();
    expect(wrapper.emitted("skip")).toHaveLength(1);
    wrapper.unmount();
  });
});
