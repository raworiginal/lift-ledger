<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";
import AdminUserActions from "./AdminUserActions.vue";
import AdminUserBanDetails from "./AdminUserBanDetails.vue";
import AdminUserProviders from "./AdminUserProviders.vue";

defineProps<{
  users: AdminUser[];
}>();

const emit = defineEmits<{
  edit: [user: AdminUser];
  resetPassword: [user: AdminUser];
  ban: [user: AdminUser];
  unban: [user: AdminUser];
  remove: [user: AdminUser];
  viewSessions: [user: AdminUser];
}>();
</script>

<template>
  <ul class="space-y-3 md:hidden" aria-label="Users">
    <li v-for="user in users" :key="user.id">
      <UCard>
        <div class="min-w-0">
          <h2 class="break-words font-semibold">{{ user.name }}</h2>
          <p class="mt-1 break-all text-sm text-muted">{{ user.email }}</p>
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="font-medium text-muted">Role</dt>
            <dd class="mt-1 break-words">{{ user.role ?? "user" }}</dd>
          </div>
          <div>
            <dt class="font-medium text-muted">Status</dt>
            <dd class="mt-1">
              <UBadge :color="user.banned ? 'error' : 'success'">
                {{ user.banned ? "Banned" : "Active" }}
              </UBadge>
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="font-medium text-muted">Sign-in providers</dt>
            <dd class="mt-1">
              <AdminUserProviders :providers="user.providers" />
            </dd>
          </div>
          <div
            v-if="user.banned && (user.banReason || user.banExpires)"
            class="col-span-2"
          >
            <AdminUserBanDetails :user="user" />
          </div>
        </dl>
        <div class="mt-4 border-t border-default pt-3">
          <AdminUserActions
            :user="user"
            @edit="emit('edit', $event)"
            @reset-password="emit('resetPassword', $event)"
            @ban="emit('ban', $event)"
            @unban="emit('unban', $event)"
            @remove="emit('remove', $event)"
            @view-sessions="emit('viewSessions', $event)"
          />
        </div>
      </UCard>
    </li>
  </ul>
</template>
