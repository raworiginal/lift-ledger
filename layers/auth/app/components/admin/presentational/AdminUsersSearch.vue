<script setup lang="ts">
import type { ListUsersSearchOptions } from "#shared/auth/types/admin";

const props = defineProps<{
  searchValue: string;
  searchField: "email" | "name";
}>();

const emit = defineEmits<{
  search: [options: ListUsersSearchOptions];
}>();

const searchValue = ref(props.searchValue);
const searchField = ref<"email" | "name">(props.searchField);

watch(
  () => props.searchValue,
  (value) => {
    searchValue.value = value;
  },
);

watch(
  () => props.searchField,
  (value) => {
    searchField.value = value;
  },
);

function submitSearch() {
  emit("search", {
    searchValue: searchValue.value.trim(),
    searchField: searchField.value,
    searchOperator: "contains",
  });
}
</script>

<template>
  <form
    class="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
    @submit.prevent="submitSearch"
  >
    <UInput
      id="admin-user-search"
      v-model="searchValue"
      class="w-full min-w-0 sm:flex-1"
      type="search"
      icon="i-lucide-search"
      placeholder="Search users"
      aria-label="Search users"
    />
    <USelect
      id="admin-user-search-field"
      v-model="searchField"
      class="w-full sm:w-auto"
      :items="[
        { label: 'Name', value: 'name' },
        { label: 'Email', value: 'email' },
      ]"
      aria-label="Search field"
    />
    <UButton class="w-full sm:w-auto" type="submit">Search</UButton>
  </form>
</template>
