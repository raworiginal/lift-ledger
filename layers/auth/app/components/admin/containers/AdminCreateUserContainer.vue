<script setup lang="ts">
import type { CreateAdminUserFormData } from "#shared/auth/types/admin";

const emit = defineEmits<{
  created: [];
}>();

const open = defineModel<boolean>("open", { required: true });

const { loading, error, successMessage, submit } = useCreateAdminUser();
const toast = useToast();

const formKey = ref(0);

watch(successMessage, (message) => {
  if (!message) return;

  formKey.value += 1;
  toast.add({ title: message, color: "success" });
  emit("created");
});

function handleSubmit(input: CreateAdminUserFormData) {
  return submit(input);
}
</script>

<template>
  <AppModal v-model:open="open" title="Create user" :close-disabled="loading">
    <AdminCreateUserForm
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
      <UButton type="submit" form="admin-create-user-form" :loading="loading">
        {{ loading ? "Creating..." : "Create user" }}
      </UButton>
    </template>
  </AppModal>
</template>
