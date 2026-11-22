<script setup lang="ts">
import type { HeatmapCell } from "~~/shared/activity/heatmap";
import { formatWorkoutDate } from "~/utils/workout-dates";

defineProps<{
  cells: HeatmapCell[];
}>();
</script>

<template>
  <div class="overflow-x-auto pb-1">
    <div
      role="img"
      aria-label="Days with a completed workout, last 52 weeks"
      class="grid w-max grid-flow-col grid-rows-7 gap-1"
    >
      <span
        v-for="cell in cells"
        :key="cell.date"
        :title="
          cell.active
            ? `${formatWorkoutDate(cell.date)}: workout`
            : formatWorkoutDate(cell.date)
        "
        class="size-3 rounded-sm"
        :class="cell.active ? 'bg-primary' : 'bg-accented'"
      />
    </div>
  </div>
</template>
