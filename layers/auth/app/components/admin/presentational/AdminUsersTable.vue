<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminUser } from "#shared/auth/types/admin";
import AdminUserActions from "./AdminUserActions.vue";
import AdminUserBanDetails from "./AdminUserBanDetails.vue";
import AdminUserProviders from "./AdminUserProviders.vue";

defineProps<{
  users: AdminUser[];
  loading: boolean;
}>();

const emit = defineEmits<{
  edit: [user: AdminUser];
  resetPassword: [user: AdminUser];
  ban: [user: AdminUser];
  unban: [user: AdminUser];
  remove: [user: AdminUser];
  viewSessions: [user: AdminUser];
}>();

const columns: TableColumn<AdminUser>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "providers", header: "Sign-in providers" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "banned", header: "Status" },
  { id: "actions", header: "Actions" },
];
</script>

<template>
  <div class="hidden overflow-x-auto md:block">
    <UTable
      :data="users"
      :columns="columns"
      :loading="loading"
      class="min-w-[48rem]"
    >
      <template #empty>
        <p v-if="loading" class="py-8 text-center text-muted" role="status">
          Loading users...
        </p>
        <UEmpty
          v-else
          icon="i-lucide-users-round"
          title="No users found"
          description="Try changing your search or create a user."
        />
      </template>
      <template #name-cell="{ row }">
        <span class="max-w-56 break-words">{{ row.original.name }}</span>
      </template>
      <template #email-cell="{ row }">
        <span class="max-w-64 break-all">{{ row.original.email }}</span>
      </template>
      <template #providers-cell="{ row }">
        <AdminUserProviders
          :providers="row.original.providers"
          class="min-w-40"
        />
      </template>
      <template #role-cell="{ row }">
        {{ row.original.role ?? "user" }}
      </template>
      <template #banned-cell="{ row }">
        <div class="min-w-36">
          <UBadge :color="row.original.banned ? 'error' : 'success'">
            {{ row.original.banned ? "Banned" : "Active" }}
          </UBadge>
          <AdminUserBanDetails :user="row.original" />
        </div>
      </template>
      <template #actions-cell="{ row }">
        <AdminUserActions
          :user="row.original"
          @edit="emit('edit', $event)"
          @reset-password="emit('resetPassword', $event)"
          @ban="emit('ban', $event)"
          @unban="emit('unban', $event)"
          @remove="emit('remove', $event)"
          @view-sessions="emit('viewSessions', $event)"
        />
      </template>
    </UTable>
  </div>
</template>
