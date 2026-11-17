<script setup lang="ts">
import AdminRemoveUserContainer from "./AdminRemoveUserContainer.vue";
import type { AdminUser } from "#shared/auth/types/admin";

type DialogAction =
  | "edit"
  | "resetPassword"
  | "ban"
  | "unban"
  | "viewSessions"
  | "remove";
type ActiveDialogAction = Exclude<DialogAction, "remove">;
type ActiveDialog = { action: ActiveDialogAction; user: AdminUser } | null;

const emit = defineEmits<{
  refresh: [];
}>();

const activeDialog = ref<ActiveDialog>(null);
const overlay = useOverlay();
const removeDialog = overlay.create(AdminRemoveUserContainer);

function open(action: DialogAction, user: AdminUser) {
  if (action === "remove") {
    void confirmRemove(user);
    return;
  }

  activeDialog.value = { action, user };
}

function dialogUser(action: ActiveDialogAction) {
  return activeDialog.value?.action === action ? activeDialog.value.user : null;
}

function setDialogOpen(action: ActiveDialogAction, isOpen: boolean) {
  if (!isOpen && activeDialog.value?.action === action) {
    activeDialog.value = null;
  }
}

async function confirmRemove(user: AdminUser) {
  const { result } = removeDialog.open({ user });
  if (await result) emit("refresh");
}

defineExpose({ open });
</script>

<template>
  <AdminEditUserContainer
    :open="activeDialog?.action === 'edit'"
    :user="dialogUser('edit')"
    @update:open="setDialogOpen('edit', $event)"
    @updated="emit('refresh')"
  />
  <AdminResetPasswordContainer
    :open="activeDialog?.action === 'resetPassword'"
    :user="dialogUser('resetPassword')"
    @update:open="setDialogOpen('resetPassword', $event)"
    @reset="emit('refresh')"
  />
  <AdminBanUserContainer
    :open="activeDialog?.action === 'ban'"
    :user="dialogUser('ban')"
    @update:open="setDialogOpen('ban', $event)"
    @banned="emit('refresh')"
  />
  <AdminUnbanUserContainer
    :open="activeDialog?.action === 'unban'"
    :user="dialogUser('unban')"
    @update:open="setDialogOpen('unban', $event)"
    @unbanned="emit('refresh')"
  />
  <AdminUserSessionsContainer
    :open="activeDialog?.action === 'viewSessions'"
    :user="dialogUser('viewSessions')"
    @update:open="setDialogOpen('viewSessions', $event)"
  />
</template>
