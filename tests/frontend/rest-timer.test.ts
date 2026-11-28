import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useRestTimer } from "~/composables/workouts/useRestTimer";

const RestTimerHarness = defineComponent({
  setup() {
    const timer = useRestTimer();
    return () =>
      h("div", [
        h("span", { "data-testid": "remaining" }, [
          String(timer.remainingSeconds.value),
        ]),
        h(
          "button",
          { onClick: () => timer.start(2), "data-testid": "start" },
          "Start",
        ),
        h(
          "button",
          { onClick: () => timer.start(0), "data-testid": "disable" },
          "Disable",
        ),
        h("button", { onClick: timer.skip, "data-testid": "skip" }, "Skip"),
      ]);
  },
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRestTimer", () => {
  it("counts down to completion and can be skipped", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const wrapper = mount(RestTimerHarness);

    await wrapper.get('[data-testid="start"]').trigger("click");
    expect(wrapper.get('[data-testid="remaining"]').text()).toBe("2");

    await vi.advanceTimersByTimeAsync(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="remaining"]').text()).toBe("1");

    await vi.advanceTimersByTimeAsync(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="remaining"]').text()).toBe("0");

    await wrapper.get('[data-testid="skip"]').trigger("click");
    expect(wrapper.get('[data-testid="remaining"]').text()).toBe("null");
    wrapper.unmount();
  });

  it("does not start when the selected rest time is zero", async () => {
    vi.useFakeTimers();
    const wrapper = mount(RestTimerHarness);
    await wrapper.get('[data-testid="disable"]').trigger("click");

    expect(wrapper.get('[data-testid="remaining"]').text()).toBe("null");
    wrapper.unmount();
  });
});
