<script setup lang="ts">
import type {
  AdminUser,
  EditAdminUserFormData,
  EditAdminUserInput,
} from "#shared/auth/types/admin";

const props = defineProps<{
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const open = defineModel<boolean>("open", { required: true });
const formKey = ref(0);
const { loading, error, successMessage, clearState, submit } =
  useEditAdminUser();
const toast = useToast();

const initialValues = computed<EditAdminUserFormData>(() => ({
  name: props.user?.name ?? "",
  email: props.user?.email ?? "",
  role: props.user?.role === "admin" ? "admin" : "user",
}));

watch(open, (isOpen) => {
  if (!isOpen) return;

  formKey.value += 1;
  clearState();
});

watch(
  () => props.user,
  (user) => {
    if (!user || !open.value) return;

    formKey.value += 1;
    clearState();
  },
);

watch(successMessage, (message) => {
  if (!message) return;

  toast.add({ title: message, color: "success" });
  emit("updated");
});

function handleSubmit(input: EditAdminUserFormData) {
  if (!props.user) return;

  const editInput: EditAdminUserInput = {
    userId: props.user.id,
    ...input,
  };

  return submit(editInput);
}
</script>

<template>
  <AppModal v-model:open="open" title="Edit user" :close-disabled="loading">
    <AdminEditUserForm
      v-if="props.user"
      :key="formKey"
      :initial-values="initialValues"
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
      <UButton type="submit" form="admin-edit-user-form" :loading="loading">
        {{ loading ? "Saving..." : "Save changes" }}
      </UButton>
    </template>
  </AppModal>
</template>
