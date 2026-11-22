<script setup lang="ts">
import WorkoutHistoryList from "~/components/workouts/presentational/WorkoutHistoryList.vue";
import { useWorkoutHistory } from "~/composables/workouts/useWorkoutHistory";

const { items, hasMore, status, loadMore, retry } = useWorkoutHistory();

function openWorkout(id: string) {
  return navigateTo(`/app/workouts/${id}`);
}
</script>

<template>
  <UContainer class="space-y-6 py-6 sm:py-10">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <p class="text-sm font-medium text-primary">Workouts</p>
        <h1 class="text-3xl font-semibold text-highlighted">History</h1>
        <p class="text-muted">Completed workouts, newest first.</p>
      </div>
      <UButton
        to="/app"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
      >
        Back
      </UButton>
    </header>

    <UAlert
      v-if="status === 'error'"
      color="error"
      variant="subtle"
      title="Could not load your workouts."
    >
      <template #actions>
        <UButton size="sm" color="neutral" variant="outline" @click="retry">
          Try again
        </UButton>
      </template>
    </UAlert>

    <WorkoutHistoryList
      :items="items"
      :has-more="hasMore"
      :loading="status === 'pending'"
      @load-more="loadMore"
      @open="openWorkout"
    />
  </UContainer>
</template>
