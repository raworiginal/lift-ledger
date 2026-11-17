<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";
import AdminUsersMobileList from "./AdminUsersMobileList.vue";
import AdminUsersTable from "./AdminUsersTable.vue";

const props = defineProps<{
  users: AdminUser[];
  total: number;
  loading: boolean;
  error: string | null;
  limit?: number;
  offset?: number;
  pageSizeOptions: readonly number[];
}>();

const emit = defineEmits<{
  edit: [user: AdminUser];
  resetPassword: [user: AdminUser];
  ban: [user: AdminUser];
  unban: [user: AdminUser];
  remove: [user: AdminUser];
  viewSessions: [user: AdminUser];
  pageChange: [offset: number];
  pageSizeChange: [limit: number];
}>();

const pageSizeItems = computed(() =>
  props.pageSizeOptions.map((size) => ({ label: String(size), value: size })),
);
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Unable to load users"
      :description="error"
      role="alert"
    />

    <p v-if="!error" class="text-sm text-muted" aria-live="polite">
      {{ total }} {{ total === 1 ? "user" : "users" }} found.
    </p>

    <UEmpty
      v-if="users.length === 0 && !loading && !error"
      class="md:hidden"
      icon="i-lucide-users-round"
      title="No users found"
      description="Try changing your search or create a user."
    />
    <p
      v-else-if="loading"
      class="py-8 text-center text-muted md:hidden"
      role="status"
    >
      Loading users...
    </p>

    <AdminUsersMobileList
      v-if="users.length > 0 && !error"
      :users="users"
      @edit="emit('edit', $event)"
      @reset-password="emit('resetPassword', $event)"
      @ban="emit('ban', $event)"
      @unban="emit('unban', $event)"
      @remove="emit('remove', $event)"
      @view-sessions="emit('viewSessions', $event)"
    />

    <AdminUsersTable
      v-if="!error"
      :users="users"
      :loading="loading"
      @edit="emit('edit', $event)"
      @reset-password="emit('resetPassword', $event)"
      @ban="emit('ban', $event)"
      @unban="emit('unban', $event)"
      @remove="emit('remove', $event)"
      @view-sessions="emit('viewSessions', $event)"
    />

    <div
      v-if="!loading && !error"
      class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2 text-sm">
        <span>Users per page</span>
        <USelect
          id="admin-user-page-size"
          class="w-24"
          :items="pageSizeItems"
          :model-value="limit"
          aria-label="Users per page"
          @update:model-value="emit('pageSizeChange', Number($event))"
        />
      </div>
      <UPagination
        v-if="total > 0"
        :page="Math.floor((offset ?? 0) / (limit ?? 1)) + 1"
        :items-per-page="limit ?? 1"
        :total="total"
        size="sm"
        @update:page="emit('pageChange', ($event - 1) * (limit ?? 1))"
      />
    </div>
  </div>
</template>
