<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  remainingSeconds: number;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  skip: [];
}>();

const displayTime = computed(() => {
  const minutes = Math.floor(props.remainingSeconds / 60);
  const seconds = props.remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});

function finishOrSkip() {
  emit("skip");
}
</script>

<template>
  <UModal
    :open="open"
    title="Rest timer"
    description="Take a breather before your next set."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-3 py-4 text-center">
        <p class="text-sm font-medium text-muted" role="status">
          {{ remainingSeconds > 0 ? "Time remaining" : "Rest complete" }}
        </p>
        <p
          class="font-mono text-6xl font-semibold tabular-nums text-highlighted"
          aria-live="off"
        >
          {{ displayTime }}
        </p>
        <p v-if="remainingSeconds === 0" class="text-sm text-muted">
          Ready for your next set.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-between gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="emit('update:open', false)"
        >
          Minimize
        </UButton>
        <UButton color="primary" @click="finishOrSkip">
          {{ remainingSeconds > 0 ? "Skip rest" : "Done" }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UButton
    v-if="!open"
    class="fixed bottom-4 right-4 z-40 shadow-lg"
    icon="i-lucide-timer"
    :aria-label="
      remainingSeconds > 0
        ? `Open rest timer, ${displayTime} remaining`
        : 'Open rest timer, rest complete'
    "
    @click="emit('update:open', true)"
  >
    {{ remainingSeconds > 0 ? `Rest ${displayTime}` : "Rest complete" }}
  </UButton>
</template>
