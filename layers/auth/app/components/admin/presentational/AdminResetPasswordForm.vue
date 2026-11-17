<script setup lang="ts">
import type { ResetAdminUserPasswordFormData } from "#shared/auth/types/admin";
import { resetAdminUserPasswordSchema } from "#shared/auth/schemas/admin";
import type { FormSubmitEvent } from "@nuxt/ui";

const formSchema = resetAdminUserPasswordSchema.omit({ userId: true });

const props = defineProps<{
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [input: ResetAdminUserPasswordFormData];
}>();

const form = reactive<ResetAdminUserPasswordFormData>({
  newPassword: "",
  confirmPassword: "",
});

function handleSubmit(event: FormSubmitEvent<ResetAdminUserPasswordFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    id="admin-reset-password-form"
    :schema="formSchema"
    :state="form"
    :disabled="props.loading"
    class="space-y-4"
    @submit="handleSubmit"
  >
    <p v-if="props.error" class="text-error" role="alert">
      {{ props.error }}
    </p>
    <PasswordField
      v-model:password="form.newPassword"
      id="admin-reset-password-new"
      label="New password"
      name="newPassword"
    />
    <PasswordField
      v-model:password="form.confirmPassword"
      id="admin-reset-password-confirm"
      label="Confirm password"
      name="confirmPassword"
    />
  </UForm>
</template>
