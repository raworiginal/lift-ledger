<script setup lang="ts">
import ExerciseFilters from "~/components/exercises/ExerciseFilters.vue";
import ExerciseResults from "~/components/exercises/ExerciseResults.vue";
import type {
  ExerciseAlternative,
  ExerciseFilters as ExerciseFilterValues,
  ExerciseListResponse,
  FilterOptions,
} from "~/components/exercises/types";

const filters = reactive<ExerciseFilterValues>({
  search: "",
  bodyPart: "",
  equipment: "",
  muscle: "",
  muscleRole: "any",
  forceType: "",
  category: "",
  mechanic: "",
  limit: 24,
  offset: 0,
});

const query = computed(() => ({
  search: filters.search.trim() || undefined,
  bodyPart: filters.bodyPart || undefined,
  equipment: filters.equipment || undefined,
  muscle: filters.muscle || undefined,
  muscleRole: filters.muscleRole,
  forceType: filters.forceType || undefined,
  category: filters.category || undefined,
  mechanic: filters.mechanic || undefined,
  limit: filters.limit,
  offset: filters.offset,
}));

const {
  data: results,
  status,
  error,
} = await useFetch<ExerciseListResponse>("/api/exercises", {
  query,
  default: () => ({ items: [], total: 0, limit: 24, offset: 0 }),
});

const { data: filterOptions } = await useFetch<FilterOptions>(
  "/api/exercises/filters",
  {
    default: () => ({
      bodyParts: [],
      categories: [],
      equipment: [],
      forceTypes: [],
      mechanics: [],
      muscles: [],
    }),
  },
);

watch(
  () => [
    filters.search,
    filters.bodyPart,
    filters.equipment,
    filters.muscle,
    filters.muscleRole,
    filters.forceType,
    filters.category,
    filters.mechanic,
  ],
  () => {
    filters.offset = 0;
  },
);

const openAlternativesFor = ref<string | null>(null);
const alternativesByExercise = reactive<Record<string, ExerciseAlternative[]>>(
  {},
);
const alternativeErrors = reactive<Record<string, string>>({});
const loadingAlternativesFor = ref<string | null>(null);

async function toggleAlternatives(exerciseId: string) {
  if (openAlternativesFor.value === exerciseId) {
    openAlternativesFor.value = null;
    return;
  }

  openAlternativesFor.value = exerciseId;
  if (alternativesByExercise[exerciseId]) return;

  loadingAlternativesFor.value = exerciseId;
  delete alternativeErrors[exerciseId];

  try {
    const response = await $fetch<{ alternatives: ExerciseAlternative[] }>(
      `/api/exercises/${exerciseId}/alternatives`,
    );
    alternativesByExercise[exerciseId] = response.alternatives;
  } catch {
    alternativeErrors[exerciseId] =
      "Alternatives could not be loaded. Please try again.";
  } finally {
    loadingAlternativesFor.value = null;
  }
}

function pageBack() {
  filters.offset = Math.max(0, filters.offset - filters.limit);
}

function pageForward() {
  filters.offset += filters.limit;
}

function updateFilters(patch: Partial<ExerciseFilterValues>) {
  Object.assign(filters, patch);
}
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="space-y-8">
      <header class="space-y-2">
        <NuxtLink to="/app" class="text-sm font-medium text-primary">
          Back to your account
        </NuxtLink>
        <h1 class="text-3xl font-semibold text-highlighted">
          Exercise catalog
        </h1>
        <p class="max-w-2xl text-muted">
          Filter exercises by their training characteristics and find
          alternatives that target similar muscles.
        </p>
      </header>

      <ExerciseFilters
        :filters="filters"
        :options="filterOptions"
        @change="updateFilters"
      />

      <ExerciseResults
        :results="results"
        :status="status"
        :has-error="Boolean(error)"
        :open-alternatives-for="openAlternativesFor"
        :alternatives-by-exercise="alternativesByExercise"
        :alternative-errors="alternativeErrors"
        :loading-alternatives-for="loadingAlternativesFor"
        @page-back="pageBack"
        @page-forward="pageForward"
        @toggle-alternatives="toggleAlternatives"
      />

      <p class="border-t border-muted pt-4 text-sm text-muted">
        <a
          href="https://repdb.co"
          target="_blank"
          rel="nofollow noopener noreferrer"
          class="font-medium text-primary underline"
        >
          Exercise data by RepDB (repdb.co)
        </a>
      </p>
    </div>
  </UContainer>
</template>
