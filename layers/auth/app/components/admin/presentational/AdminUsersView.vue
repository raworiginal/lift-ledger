<script setup lang="ts">
import type {
  AdminUser,
  ListUsersSearchOptions,
} from "#shared/auth/types/admin";
import AdminUsersList from "./AdminUsersList.vue";
import AdminUsersSearch from "./AdminUsersSearch.vue";

defineProps<{
  authMode: string;
  canResetPassword: boolean;
  searchValue: string;
  searchField: "email" | "name";
  users: AdminUser[];
  total: number;
  loading: boolean;
  error: string | null;
  limit?: number;
  offset?: number;
  pageSizeOptions: readonly number[];
}>();

const emit = defineEmits<{
  createUser: [];
  search: [options: ListUsersSearchOptions];
  edit: [user: AdminUser];
  resetPassword: [user: AdminUser];
  ban: [user: AdminUser];
  unban: [user: AdminUser];
  remove: [user: AdminUser];
  viewSessions: [user: AdminUser];
  pageChange: [offset: number];
  pageSizeChange: [limit: number];
}>();
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <AdminUsersSearch
            class="min-w-0 flex-1"
            :search-value="searchValue"
            :search-field="searchField"
            @search="emit('search', $event)"
          />
        </template>
        <template #right>
          <UButton
            v-if="authMode !== 'social-only'"
            class="w-full sm:w-auto"
            icon="i-lucide-user-round-plus"
            type="button"
            @click="emit('createUser')"
          >
            Create user
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <AdminUsersList
        :users="users"
        :total="total"
        :loading="loading"
        :error="error"
        :limit="limit"
        :offset="offset"
        :page-size-options="pageSizeOptions"
        :can-reset-password="canResetPassword"
        @edit="emit('edit', $event)"
        @reset-password="emit('resetPassword', $event)"
        @ban="emit('ban', $event)"
        @unban="emit('unban', $event)"
        @remove="emit('remove', $event)"
        @view-sessions="emit('viewSessions', $event)"
        @page-size-change="emit('pageSizeChange', $event)"
        @page-change="emit('pageChange', $event)"
      />
    </template>
  </UDashboardPanel>
</template>
