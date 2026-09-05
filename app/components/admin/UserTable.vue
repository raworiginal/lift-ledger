<template>
  <div class="overflow-x-auto">
    <table class="table table-zebra">
      <thead>
        <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th><span class="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>
            <div class="font-semibold">{{ user.name || "Unnamed user" }}</div>
            <div class="text-sm text-base-content/60">{{ user.email }}</div>
          </td>
          <td><span class="badge" :class="user.role === 'admin' ? 'badge-primary' : 'badge-ghost'">{{ user.role || "user" }}</span></td>
          <td><span class="badge" :class="user.banned ? 'badge-warning' : 'badge-success'">{{ user.banned ? "Suspended" : "Active" }}</span></td>
          <td class="whitespace-nowrap text-sm text-base-content/60">{{ formatDate(user.createdAt) }}</td>
          <td>
            <div class="flex flex-wrap justify-end gap-2">
              <button class="btn btn-ghost btn-xs" type="button" @click="$emit('edit', user)">Edit</button>
              <button class="btn btn-ghost btn-xs" type="button" @click="$emit('toggle-status', user)">{{ user.banned ? "Activate" : "Suspend" }}</button>
              <button class="btn btn-ghost btn-xs" type="button" @click="$emit('reset-password', user)">Reset password</button>
              <button class="btn btn-ghost btn-xs text-error" type="button" :disabled="!canDelete(user)" :title="deleteReason(user)" @click="$emit('delete', user)">Delete</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt?: string | Date;
};

const props = defineProps<{
  users: AdminUser[];
  currentUserId?: string;
}>();

defineEmits<{
  edit: [user: AdminUser];
  "toggle-status": [user: AdminUser];
  "reset-password": [user: AdminUser];
  delete: [user: AdminUser];
}>();

const adminCount = computed(() => props.users.filter((user) => user.role === "admin").length);
const canDelete = (user: AdminUser) => user.id !== props.currentUserId && !(user.role === "admin" && adminCount.value <= 1);
const deleteReason = (user: AdminUser) => user.id === props.currentUserId ? "You cannot delete yourself" : user.role === "admin" && adminCount.value <= 1 ? "The last admin cannot be deleted" : "Delete user";
const formatDate = (value?: string | Date) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};
</script>
