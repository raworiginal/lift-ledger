<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";
import AdminCreateUserContainer from "#layers/auth/app/components/admin/containers/AdminCreateUserContainer.vue";
import AdminUsersDialogsContainer from "#layers/auth/app/components/admin/containers/AdminUsersDialogsContainer.vue";
import AdminUsersView from "#layers/auth/app/components/admin/presentational/AdminUsersView.vue";
import { ADMIN_USERS_PAGE_SIZE_OPTIONS } from "#layers/auth/app/utils/admin";

definePageMeta({
  layout: "admin",
});

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

  <AdminUsersView
    :auth-mode="authMode"
    :search-value="options.searchValue ?? ''"
    :search-field="options.searchField ?? 'name'"
    :users="users"
    :total="total"
    :loading="loading"
    :error="error"
    :limit="options.limit"
    :offset="options.offset"
    :page-size-options="ADMIN_USERS_PAGE_SIZE_OPTIONS"
    @create-user="createUserOpen = true"
    @search="handleSearch"
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
