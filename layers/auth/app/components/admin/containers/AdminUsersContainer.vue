<script setup lang="ts">
import AdminCreateUserContainer from "./AdminCreateUserContainer.vue";
import AdminUsersDialogsContainer from "./AdminUsersDialogsContainer.vue";
import type { AdminUser } from "#shared/auth/types/admin";
import { ADMIN_USERS_PAGE_SIZE_OPTIONS } from "#layers/auth/app/utils/admin";

const { options, updateOptions, handleSearch } = useAdminUsersQuery();
const authMode = useRuntimeConfig().public.authMode;

const { users, total, loading, error, refresh } = await useAdminUsers(options);
const dialogs = ref<InstanceType<typeof AdminUsersDialogsContainer> | null>(
  null,
);
const createUserOpen = ref(false);

function openDialog(
  action: Parameters<NonNullable<typeof dialogs.value>["open"]>[0],
  user: AdminUser,
) {
  dialogs.value?.open(action, user);
}
</script>

<template>
  <AdminUsersDialogsContainer ref="dialogs" @refresh="refresh" />
  <AdminCreateUserContainer v-model:open="createUserOpen" @created="refresh" />

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
            :search-value="options.searchValue ?? ''"
            :search-field="options.searchField ?? 'name'"
            @search="handleSearch"
          />
        </template>
        <template #right>
          <UButton
            v-if="authMode !== 'social-only'"
            class="w-full sm:w-auto"
            icon="i-lucide-user-round-plus"
            type="button"
            @click="createUserOpen = true"
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
        :limit="options.limit"
        :offset="options.offset"
        :page-size-options="ADMIN_USERS_PAGE_SIZE_OPTIONS"
        @edit="openDialog('edit', $event)"
        @reset-password="openDialog('resetPassword', $event)"
        @ban="openDialog('ban', $event)"
        @unban="openDialog('unban', $event)"
        @remove="openDialog('remove', $event)"
        @view-sessions="openDialog('viewSessions', $event)"
        @page-size-change="updateOptions({ limit: $event, offset: 0 })"
        @page-change="updateOptions({ offset: $event })"
      />
    </template>
  </UDashboardPanel>
</template>
