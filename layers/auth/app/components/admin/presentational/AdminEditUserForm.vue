<script setup lang="ts">
import type { EditAdminUserFormData } from "#shared/auth/types/admin";
import { editAdminUserSchema } from "#shared/auth/schemas/admin";
import type { FormSubmitEvent } from "@nuxt/ui";

const formSchema = editAdminUserSchema.omit({ userId: true });

const props = defineProps<{
  initialValues: EditAdminUserFormData;
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [input: EditAdminUserFormData];
}>();

const form = reactive<EditAdminUserFormData>({ ...props.initialValues });

function handleSubmit(event: FormSubmitEvent<EditAdminUserFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    id="admin-edit-user-form"
    :schema="formSchema"
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
        id="admin-edit-user-name"
        v-model="form.name"
        name="name"
        autocomplete="name"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Email" name="email">
      <UInput
        id="admin-edit-user-email"
        v-model="form.email"
        name="email"
        type="email"
        autocomplete="email"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Role" name="role">
      <USelect
        id="admin-edit-user-role"
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
