<script setup lang="ts">
import { workoutIdSchema } from "~~/shared/validation/workouts";
import { useWorkoutEditor } from "~/composables/workouts/useWorkoutEditor";
import ExerciseGroup from "~/components/workouts/presentational/ExerciseGroup.vue";
import ExercisePicker from "~/components/workouts/presentational/ExercisePicker.vue";
import WorkoutHeader from "~/components/workouts/presentational/WorkoutHeader.vue";
import { canFinish, nextPrefill } from "~/utils/workout-sets";
import { localDateString } from "~/utils/workout-dates";

const route = useRoute();
const workoutId = String(route.params.id);

if (!workoutIdSchema.safeParse(workoutId).success) {
  throw createError({ statusCode: 404, statusMessage: "Workout not found." });
}

const editor = useWorkoutEditor(workoutId);
const {
  detail,
  status,
  notFound,
  actionError,
  setState,
  hasPendingSave,
  selectedExerciseId,
  pickerResults,
  pickerStatus,
} = editor;

const today = ref("");

onMounted(() => {
  today.value = localDateString();
  editor.refresh();
});

const editMode = ref(false);
const editingSetId = ref<string | null>(null);
const pickerOpen = ref(false);
const pickerQuery = ref("");
const confirmOpen = ref(false);

const isDraft = computed(() => detail.value?.status === "draft");
const canEdit = computed(() => isDraft.value || editMode.value);
const canEditUnit = computed(
  () =>
    detail.value?.exercises.every((group) => group.sets.length === 0) ?? false,
);
const finishAllowed = computed(
  () =>
    detail.value !== null && canFinish(detail.value) && !hasPendingSave.value,
);

watch(pickerOpen, (open) => {
  if (open) editor.searchExercises(pickerQuery.value);
});

function onPickerSearch(query: string) {
  pickerQuery.value = query;
  editor.searchExercises(query);
}

async function addExercise(exerciseId: string) {
  pickerOpen.value = false;
  pickerQuery.value = "";
  await editor.addExercise(exerciseId);
  await nextTick();
  document
    .getElementById(`exercise-${exerciseId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function saveSet(exerciseId: string, values: { weight: string; reps: string }) {
  return editor.saveSet(exerciseId, values.weight, values.reps);
}

async function saveEdit(
  setId: string,
  values: { weight: string; reps: string },
) {
  if (await editor.updateSet(setId, values)) editingSetId.value = null;
}

function deleteSet(setId: string) {
  if (editingSetId.value === setId) editingSetId.value = null;
  return editor.deleteSet(setId);
}

async function finish() {
  if (await editor.complete()) editMode.value = false;
}

function stopEditing() {
  editMode.value = false;
  editingSetId.value = null;
}

async function confirmDiscard() {
  confirmOpen.value = false;
  if (await editor.discard()) await navigateTo("/app");
}

function prefillFor(exerciseId: string) {
  return nextPrefill(editor.lastSetFor(exerciseId));
}

function prefillSourceFor(exerciseId: string) {
  return editor.lastSetFor(exerciseId)?.id ?? null;
}

function saveStateFor(exerciseId: string) {
  return selectedExerciseId.value === exerciseId ? setState.value : "idle";
}
</script>

<template>
  <UContainer class="space-y-6 py-6 sm:py-10">
    <NuxtLink
      to="/app/workouts"
      class="text-sm text-muted hover:text-highlighted"
    >
      ← Workout history
    </NuxtLink>

    <UAlert
      v-if="notFound"
      color="error"
      variant="subtle"
      title="This workout doesn't exist."
    />
    <UAlert
      v-else-if="!detail && status === 'error'"
      color="error"
      variant="subtle"
      title="Could not load this workout."
    >
      <template #actions>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          @click="editor.refresh()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>
    <p v-else-if="!detail" class="text-muted">Loading workout…</p>

    <template v-else>
      <WorkoutHeader
        :workout-date="detail.workoutDate"
        :focus="detail.focus"
        :unit="detail.unit"
        :status="detail.status"
        :today="today"
        :can-edit-unit="canEditUnit"
        :can-finish="finishAllowed"
        :editing="editMode"
        :busy="hasPendingSave"
        @update="editor.updateMetadata"
        @finish="finish"
        @discard="confirmOpen = true"
        @start-editing="editMode = true"
        @stop-editing="stopEditing"
      />

      <UAlert
        v-if="actionError"
        color="error"
        variant="subtle"
        :title="actionError"
      />

      <div v-if="detail.exercises.length" class="space-y-4">
        <ExerciseGroup
          v-for="group in detail.exercises"
          :key="group.exerciseId"
          :exercise-id="group.exerciseId"
          :name="group.name"
          :sets="group.sets"
          :unit="detail.unit"
          :editable="canEdit"
          :highlighted="selectedExerciseId === group.exerciseId"
          :prefill="prefillFor(group.exerciseId)"
          :prefill-source-id="prefillSourceFor(group.exerciseId)"
          :save-state="saveStateFor(group.exerciseId)"
          :editing-set-id="editingSetId"
          @add="(values) => saveSet(group.exerciseId, values)"
          @edit-set="(setId) => (editingSetId = setId)"
          @cancel-edit="editingSetId = null"
          @save-set="saveEdit"
          @delete-set="deleteSet"
          @remove="editor.removeExercise(group.exerciseId)"
        />
      </div>
      <p v-else class="text-muted">
        No exercises yet. Add one to start logging sets.
      </p>

      <UButton
        v-if="canEdit"
        block
        variant="soft"
        icon="i-lucide-plus"
        @click="pickerOpen = true"
      >
        Add exercise
      </UButton>

      <ExercisePicker
        v-if="canEdit"
        :open="pickerOpen"
        :query="pickerQuery"
        :results="pickerResults"
        :loading="pickerStatus === 'pending'"
        @update:open="pickerOpen = $event"
        @search="onPickerSearch"
        @select="addExercise"
      />

      <UModal
        :open="confirmOpen"
        :title="isDraft ? 'Discard this draft?' : 'Delete this workout?'"
        :description="
          isDraft
            ? 'The draft and its logged sets will be deleted.'
            : 'The workout and its sets will be removed from your history.'
        "
        @update:open="confirmOpen = $event"
      >
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="confirmOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" @click="confirmDiscard">
              {{ isDraft ? "Discard draft" : "Delete workout" }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
