<script setup lang="ts">
import type { AdminUser, BanAdminUserFormData } from "#shared/auth/types/admin";

const props = defineProps<{
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  banned: [];
}>();

const open = defineModel<boolean>("open", { required: true });
const formKey = ref(0);
const { loading, error, successMessage, clearState, submit } =
  useBanAdminUser();
const toast = useToast();

const title = computed(() =>
  props.user ? `Ban ${props.user.name}` : "Ban user",
);

watch(open, (isOpen) => {
  if (isOpen) {
    formKey.value += 1;
    clearState();
  }
});

watch(successMessage, (message) => {
  if (!message) return;
  toast.add({ title: message, color: "success" });
  emit("banned");
});

function handleSubmit(input: BanAdminUserFormData) {
  if (!props.user) return;
  return submit({ userId: props.user.id, ...input });
}
</script>

<template>
  <AppModal v-model:open="open" :title="title" :close-disabled="loading">
    <AdminBanUserForm
      v-if="props.user"
      :key="formKey"
      :loading="loading"
      :error="error"
      @submit="handleSubmit"
    />
    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="close"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        form="admin-ban-user-form"
        color="error"
        :loading="loading"
      >
        {{ loading ? "Banning..." : "Ban user" }}
      </UButton>
    </template>
  </AppModal>
</template>
