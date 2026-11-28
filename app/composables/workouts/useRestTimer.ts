export function useRestTimer() {
  const deadline = ref<number | null>(null);
  const now = ref(Date.now());
  let interval: ReturnType<typeof setInterval> | null = null;

  const remainingSeconds = computed(() => {
    if (deadline.value === null) return null;
    return Math.max(0, Math.ceil((deadline.value - now.value) / 1000));
  });

  function stopInterval() {
    if (interval === null) return;
    clearInterval(interval);
    interval = null;
  }

  function tick() {
    now.value = Date.now();
    if (deadline.value !== null && deadline.value <= now.value) stopInterval();
  }

  function start(durationSeconds: number) {
    stopInterval();
    if (durationSeconds <= 0) {
      deadline.value = null;
      return;
    }

    deadline.value = Date.now() + durationSeconds * 1000;
    tick();
    interval = setInterval(tick, 250);
  }

  function skip() {
    deadline.value = null;
    stopInterval();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") tick();
  }

  onMounted(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onScopeDispose(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    stopInterval();
  });

  return { remainingSeconds, start, skip };
}
