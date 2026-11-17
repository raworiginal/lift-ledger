<script setup lang="ts">
import type { CreateAdminUserFormData } from "#shared/auth/types/admin";
import { createAdminUserSchema } from "#shared/auth/schemas/admin";
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [input: CreateAdminUserFormData];
}>();

const form = reactive<CreateAdminUserFormData>({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "user",
});

function handleSubmit(event: FormSubmitEvent<CreateAdminUserFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    id="admin-create-user-form"
    :schema="createAdminUserSchema"
    :state="form"
    :disabled="props.loading"
    class="space-y-4"
    @submit="handleSubmit"
  >
    <p v-if="props.error" class="text-error" role="alert">
      {{ props.error }}
    </p>
    <UFormField label="Name" name="name">
      <UInput
        id="admin-create-user-name"
        v-model="form.name"
        name="name"
        autocomplete="name"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Email" name="email">
      <UInput
        id="admin-create-user-email"
        v-model="form.email"
        name="email"
        type="email"
        autocomplete="email"
        class="w-full"
      />
    </UFormField>

    <PasswordField
      v-model:password="form.password"
      id="admin-create-user-password"
      label="Password"
      name="password"
    />
    <PasswordField
      v-model:password="form.confirmPassword"
      id="admin-create-user-confirm-password"
      label="Confirm password"
      name="confirmPassword"
    />

    <UFormField label="Role" name="role">
      <USelect
        id="admin-create-user-role"
        v-model="form.role"
        name="role"
        :items="[
          { label: 'User', value: 'user' },
          { label: 'Admin', value: 'admin' },
        ]"
        class="w-full"
      />
    </UFormField>
  </UForm>
</template>
