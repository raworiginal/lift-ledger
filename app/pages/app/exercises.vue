<script setup lang="ts">
type MuscleOption = {
  id: string;
  nameEn: string;
  imagePath: string | null;
};

type ExerciseCard = {
  id: string;
  nameEn: string;
  descriptionEn: string;
  category: string;
  forceType: string;
  mechanic: string;
  difficulty: string;
  equipment: string | null;
  images: Record<string, Record<string, string>>;
  primaryMuscles: MuscleOption[];
  secondaryMuscles: MuscleOption[];
};

type ExerciseSimilarity = {
  score: number;
  sharedMuscles: string[];
  sharedPrimaryMuscles: string[];
  sharedSecondaryMuscles: string[];
  sameVariationGroup: boolean;
};

type ExerciseListResponse = {
  items: ExerciseCard[];
  total: number;
  limit: number;
  offset: number;
};

type ExerciseAlternativesResponse = {
  exerciseId: string;
  alternatives: Array<ExerciseCard & { similarity: ExerciseSimilarity }>;
};

type FilterOptions = {
  bodyParts: string[];
  categories: string[];
  equipment: string[];
  forceTypes: string[];
  mechanics: string[];
  muscles: MuscleOption[];
};

const filters = reactive({
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
const alternativesByExercise = reactive<
  Record<string, ExerciseAlternativesResponse["alternatives"]>
>({});
const alternativeErrors = reactive<Record<string, string>>({});
const loadingAlternativesFor = ref<string | null>(null);

function readable(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function imageFor(exercise: ExerciseCard): string | undefined {
  const flatImages = exercise.images.flat;
  return flatImages?.main ?? flatImages?.start ?? flatImages?.peak;
}

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
    const response = await $fetch<ExerciseAlternativesResponse>(
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

      <section
        aria-label="Exercise filters"
        class="grid gap-4 rounded-lg border border-muted bg-elevated p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9"
      >
        <label class="grid min-w-0 gap-1.5 text-sm xl:col-span-2">
          <span class="font-medium text-highlighted">Search</span>
          <input
            v-model="filters.search"
            type="search"
            placeholder="Name or description"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          />
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Equipment</span>
          <select
            v-model="filters.equipment"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">Any equipment</option>
            <option
              v-for="equipment in filterOptions.equipment"
              :key="equipment"
              :value="equipment"
            >
              {{ readable(equipment) }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Body part</span>
          <select
            v-model="filters.bodyPart"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">Any body part</option>
            <option
              v-for="bodyPart in filterOptions.bodyParts"
              :key="bodyPart"
              :value="bodyPart"
            >
              {{ readable(bodyPart) }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Muscle</span>
          <select
            v-model="filters.muscle"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">All muscles</option>
            <option
              v-for="muscle in filterOptions.muscles"
              :key="muscle.id"
              :value="muscle.id"
            >
              {{ muscle.nameEn }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Muscle role</span>
          <select
            v-model="filters.muscleRole"
            :disabled="!filters.muscle"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default disabled:opacity-50"
          >
            <option value="any">Primary or secondary</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Force</span>
          <select
            v-model="filters.forceType"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">Any force</option>
            <option
              v-for="forceType in filterOptions.forceTypes"
              :key="forceType"
              :value="forceType"
            >
              {{ readable(forceType) }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Category</span>
          <select
            v-model="filters.category"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">Any category</option>
            <option
              v-for="category in filterOptions.categories"
              :key="category"
              :value="category"
            >
              {{ readable(category) }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Mechanic</span>
          <select
            v-model="filters.mechanic"
            class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
          >
            <option value="">Any mechanic</option>
            <option
              v-for="mechanic in filterOptions.mechanics"
              :key="mechanic"
              :value="mechanic"
            >
              {{ readable(mechanic) }}
            </option>
          </select>
        </label>
      </section>

      <p v-if="error" role="alert" class="text-sm text-error">
        Exercises could not be loaded. Please refresh and try again.
      </p>
      <p v-else-if="status === 'pending'" class="text-sm text-muted">
        Loading exercises…
      </p>
      <p v-else-if="results.total === 0" class="text-sm text-muted">
        No exercises match these filters.
      </p>

      <section v-else class="space-y-4" aria-label="Exercises">
        <p class="text-sm text-muted">
          Showing {{ results.offset + 1 }}–{{
            Math.min(results.offset + results.items.length, results.total)
          }}
          of {{ results.total }} exercises
        </p>

        <div class="grid gap-4 lg:grid-cols-2">
          <UCard v-for="exercise in results.items" :key="exercise.id">
            <div class="flex gap-4">
              <img
                v-if="imageFor(exercise)"
                :src="imageFor(exercise)"
                :alt="exercise.nameEn"
                class="size-20 shrink-0 rounded-md bg-elevated object-cover sm:size-24"
                loading="lazy"
              />
              <div class="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 class="font-semibold text-highlighted">
                    {{ exercise.nameEn }}
                  </h2>
                  <p class="text-sm text-muted">
                    {{ exercise.descriptionEn }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2 text-xs text-muted">
                  <span>{{ readable(exercise.category) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ readable(exercise.forceType) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ readable(exercise.mechanic) }}</span>
                  <span v-if="exercise.equipment" aria-hidden="true">·</span>
                  <span v-if="exercise.equipment">
                    {{ readable(exercise.equipment) }}
                  </span>
                </div>
                <div class="space-y-1 text-xs">
                  <p>
                    <span class="font-medium text-highlighted">Primary: </span>
                    <span class="text-muted">
                      {{
                        exercise.primaryMuscles
                          .map((muscle) => muscle.nameEn)
                          .join(", ") || "Not specified"
                      }}
                    </span>
                  </p>
                  <p>
                    <span class="font-medium text-highlighted">
                      Secondary:
                    </span>
                    <span class="text-muted">
                      {{
                        exercise.secondaryMuscles
                          .map((muscle) => muscle.nameEn)
                          .join(", ") || "Not specified"
                      }}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <UButton
                type="button"
                size="sm"
                color="neutral"
                variant="outline"
                :loading="loadingAlternativesFor === exercise.id"
                @click="toggleAlternatives(exercise.id)"
              >
                {{
                  openAlternativesFor === exercise.id
                    ? "Hide alternatives"
                    : "Suggest alternatives"
                }}
              </UButton>
            </div>

            <div
              v-if="openAlternativesFor === exercise.id"
              class="mt-4 border-t border-muted pt-4"
            >
              <p
                v-if="alternativeErrors[exercise.id]"
                role="alert"
                class="text-sm text-error"
              >
                {{ alternativeErrors[exercise.id] }}
              </p>
              <p
                v-else-if="loadingAlternativesFor === exercise.id"
                class="text-sm text-muted"
              >
                Finding similar exercises…
              </p>
              <p
                v-else-if="alternativesByExercise[exercise.id]?.length === 0"
                class="text-sm text-muted"
              >
                No similar exercises were found.
              </p>
              <ul
                v-else-if="alternativesByExercise[exercise.id]"
                class="space-y-3"
              >
                <li
                  v-for="alternative in alternativesByExercise[exercise.id]"
                  :key="alternative.id"
                  class="space-y-1"
                >
                  <p class="font-medium text-highlighted">
                    {{ alternative.nameEn }}
                  </p>
                  <p class="text-sm text-muted">
                    Shares
                    {{
                      alternative.similarity.sharedMuscles
                        .map(readable)
                        .join(", ")
                    }}
                    · same {{ readable(alternative.mechanic) }} mechanic
                    <span v-if="alternative.similarity.sameVariationGroup">
                      · same exercise variation group
                    </span>
                  </p>
                </li>
              </ul>
            </div>
          </UCard>
        </div>

        <div class="flex items-center justify-between">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="results.offset === 0"
            @click="pageBack"
          >
            Previous
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :disabled="results.offset + results.items.length >= results.total"
            @click="pageForward"
          >
            Next
          </UButton>
        </div>
      </section>

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
