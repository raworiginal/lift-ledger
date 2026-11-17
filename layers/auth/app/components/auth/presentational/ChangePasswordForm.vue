<script setup lang="ts">
import type { ChangePasswordFormData } from "#shared/auth/types/auth";
import { passwordChangeSchema } from "#shared/auth/schemas/auth";
import type { FormSubmitEvent } from "@nuxt/ui";

const { loading, error: authError } = defineProps<{
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [input: ChangePasswordFormData];
}>();

const form = reactive<ChangePasswordFormData>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

function handleSubmit(event: FormSubmitEvent<ChangePasswordFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    :schema="passwordChangeSchema"
    :state="form"
    :disabled="loading"
    @submit="handleSubmit"
  >
    <Fieldset title="Change Password">
      <p v-if="authError" class="text-error mt-2" role="alert">
        {{ authError }}
      </p>
      <PasswordField
        v-model:password="form.currentPassword"
        id="current-password"
        label="Current password"
        name="currentPassword"
        autocomplete="current-password"
      />
      <PasswordField
        v-model:password="form.newPassword"
        id="new-password"
        label="New password"
        name="newPassword"
      />
      <PasswordField
        v-model:password="form.confirmPassword"
        id="confirm-new-password"
        label="Confirm new password"
        name="confirmPassword"
      />

      <UButton class="mt-4" type="submit" :loading="loading">
        {{ loading ? "Changing..." : "Change password" }}
      </UButton>
    </Fieldset>
  </UForm>
</template>
