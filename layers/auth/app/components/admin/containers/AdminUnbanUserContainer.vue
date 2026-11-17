<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";

const props = defineProps<{
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  unbanned: [];
}>();

const open = defineModel<boolean>("open", { required: true });
const { loading, error, successMessage, clearState, submit } =
  useUnbanAdminUser();
const toast = useToast();

const title = computed(() =>
  props.user ? `Unban ${props.user.name}` : "Unban user",
);

watch(open, (isOpen) => {
  if (isOpen) clearState();
});

watch(successMessage, (message) => {
  if (!message) return;
  toast.add({ title: message, color: "success" });
  emit("unbanned");
});

function handleConfirm() {
  if (!props.user) return;
  return submit({ userId: props.user.id });
}
</script>

<template>
  <AppModal v-model:open="open" :title="title" :close-disabled="loading">
    <div v-if="props.user">
      <p>
        Are you sure you want to unban <strong>{{ props.user.name }}</strong
        >?
      </p>
      <p v-if="error" class="text-error mt-2" role="alert">{{ error }}</p>
    </div>
    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="close"
      >
        Cancel
      </UButton>
      <UButton type="button" :loading="loading" @click="handleConfirm">
        {{ loading ? "Unbanning..." : "Unban user" }}
      </UButton>
    </template>
  </AppModal>
</template>
