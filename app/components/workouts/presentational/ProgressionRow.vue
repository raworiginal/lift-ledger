<script setup lang="ts">
import type {
  ExerciseProgression,
  ProgressionStatus,
} from "~~/shared/types/workouts";
import { formatWeightOneDecimal } from "~/utils/format-weight";

const props = defineProps<{
  item: ExerciseProgression;
}>();

const messages: Record<Exclude<ProgressionStatus, "ready">, string> = {
  below: "Below range. Hold or reduce the weight.",
  stalled: "No progress in 3 sessions.",
  building: "Add reps at this weight.",
};

const message = computed(() => {
  if (props.item.status !== "ready") return messages[props.item.status];
  return props.item.suggestedWeight
    ? `Next: ${formatWeightOneDecimal(props.item.suggestedWeight)} ${props.item.unit}`
    : "Add weight";
});
</script>

<template>
  <li class="space-y-3 py-4 first:pt-0 last:pb-0">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-medium text-highlighted">{{ item.name }}</h3>
      <p class="text-sm tabular-nums text-muted">
        {{ formatWeightOneDecimal(item.workingWeight) }} {{ item.unit }} ·
        {{ item.reps.join(" · ") }}
      </p>
    </div>
    <UProgress
      :model-value="item.progress * 100"
      :max="100"
      size="sm"
      aria-label="Progress toward the top of the rep range"
    />
    <p class="text-sm text-muted">{{ message }}</p>
  </li>
</template>
