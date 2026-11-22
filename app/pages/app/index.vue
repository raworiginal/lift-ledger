<script setup lang="ts">
import ActivityHeatmap from "~/components/workouts/presentational/ActivityHeatmap.vue";
import StartWorkoutModal from "~/components/workouts/presentational/StartWorkoutModal.vue";
import { useActivity } from "~/composables/workouts/useActivity";
import { useCurrentDraft } from "~/composables/workouts/useCurrentDraft";
import { formatWorkoutDate, localDateString } from "~/utils/workout-dates";
import { readApiError } from "~/utils/workout-errors";

const { user } = useUserSession();

const { draft, status: draftStatus, start } = useCurrentDraft();
const {
  cells: activityCells,
  hasActivity,
  status: activityStatus,
  refresh: refreshActivity,
} = useActivity();
const startOpen = ref(false);
const startPending = ref(false);
const startError = ref<string | undefined>();
const today = ref("");

onMounted(() => {
  today.value = localDateString();
  refreshActivity();
});

async function startWorkout(values: {
  date: string;
  focus: string;
  unit: "kg" | "lb";
}) {
  startPending.value = true;
  startError.value = undefined;
  try {
    const workout = await start(values);
    startOpen.value = false;
    await navigateTo(`/app/workouts/${workout.id}`);
  } catch (error) {
    startError.value = readApiError(
      error,
      "Could not start the workout. Your values are still here.",
    ).message;
  } finally {
    startPending.value = false;
  }
}

const shortcuts = computed(() => [
  {
    title: "Workout history",
    description: "Review completed workouts and correct past sessions.",
    icon: "i-lucide-history",
    to: "/app/workouts",
  },
  {
    title: "Exercise catalog",
    description:
      "Browse exercises, filter by training targets, and find alternatives.",
    icon: "i-lucide-dumbbell",
    to: "/app/exercises",
  },
]);
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="space-y-8">
      <header class="space-y-2">
        <p class="text-sm font-medium text-primary">Your account</p>
        <h1 class="text-3xl font-semibold text-highlighted">
          Welcome back, {{ user?.name || "there" }}
        </h1>
        <p class="max-w-2xl text-muted">
          Your account is ready. Choose a shortcut below to get started.
        </p>
      </header>

      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="font-semibold text-highlighted">
              {{ draft ? "Workout in progress" : "Log a workout" }}
            </h2>
            <p class="text-sm text-muted">
              <template v-if="draft">
                {{ draft.focus }} · {{ formatWorkoutDate(draft.workoutDate) }}
              </template>
              <template v-else>
                Start a session and log your sets as you go.
              </template>
            </p>
          </div>
          <UButton
            v-if="draft"
            :to="`/app/workouts/${draft.id}`"
            icon="i-lucide-play"
          >
            Resume workout
          </UButton>
          <UButton
            v-else
            icon="i-lucide-plus"
            :disabled="draftStatus === 'pending'"
            @click="startOpen = true"
          >
            Start workout
          </UButton>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-4">
          <div class="space-y-1">
            <h2 class="font-semibold text-highlighted">Activity</h2>
            <p class="text-sm text-muted">
              Days with a completed workout over the last 52 weeks.
            </p>
          </div>
          <div
            v-if="activityStatus === 'error'"
            class="flex flex-wrap items-center justify-between gap-2"
            role="alert"
          >
            <p class="text-sm text-error">Could not load your activity.</p>
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              @click="refreshActivity()"
            >
              Try again
            </UButton>
          </div>
          <p
            v-else-if="
              activityStatus === 'idle' || activityStatus === 'pending'
            "
            class="text-sm text-muted"
            role="status"
          >
            Loading your activity…
          </p>
          <template v-else>
            <ActivityHeatmap :cells="activityCells" />
            <p v-if="!hasActivity" class="text-sm text-muted">
              No completed workouts in the last 52 weeks yet.
            </p>
          </template>
        </div>
      </UCard>

      <StartWorkoutModal
        :open="startOpen"
        :default-date="today"
        :today="today"
        :pending="startPending"
        :error="startError"
        @update:open="startOpen = $event"
        @submit="startWorkout"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <UPageCard
          v-for="shortcut in shortcuts"
          :key="shortcut.to"
          :title="shortcut.title"
          :description="shortcut.description"
          :icon="shortcut.icon"
          :to="shortcut.to"
          class="h-full"
        />
      </div>
    </div>
  </UContainer>
</template>
