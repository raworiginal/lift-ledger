<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";

const props = defineProps<{
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  close: [removed: boolean];
}>();

const { fieldErrors, loading, error, clearState, remove } =
  useRemoveAdminUser();
const toast = useToast();

const title = "Remove user";

watch(
  () => props.user?.id,
  () => clearState(),
);

async function handleConfirm() {
  if (!props.user) return;

  const removed = await remove({ userId: props.user.id });
  if (removed) {
    toast.add({ title: "User removed successfully.", color: "success" });
    emit("close", true);
  }
}
</script>

<template>
  <UModal
    :title="title"
    :close="loading ? false : { onClick: () => emit('close', false) }"
    :dismissible="!loading"
  >
    <template #body>
      <div v-if="props.user">
        <p>
          Remove <span class="font-semibold">{{ props.user.name }}</span
          >?
        </p>
        <p class="mt-2 text-sm text-muted">This action cannot be undone.</p>

        <UAlert
          v-if="error || fieldErrors.userId"
          class="mt-4"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="Unable to remove user"
          :description="error ?? fieldErrors.userId"
          role="alert"
        />
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="emit('close', false)"
      >
        Cancel
      </UButton>
      <UButton
        color="error"
        icon="i-lucide-trash-2"
        :loading="loading"
        :disabled="!props.user"
        @click="handleConfirm"
      >
        {{ loading ? "Removing..." : "Remove user" }}
      </UButton>
    </template>
  </UModal>
</template>
