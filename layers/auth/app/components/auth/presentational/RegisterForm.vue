<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";
import type { RegisterFormData, SocialProvider } from "#shared/auth/types/auth";
import { registerSchema } from "#shared/auth/schemas/auth";

const props = defineProps<{
  loading: boolean;
  error: string | null;
  socialProviders: SocialProvider[];
  socialLoading: boolean;
  socialError: string | null;
}>();

const emit = defineEmits<{
  submit: [input: RegisterFormData];
  socialSignIn: [provider: SocialProvider];
}>();

const fields = computed<AuthFormField[]>(() => [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Email",
    autocomplete: "email",
    defaultValue: "",
    required: true,
  },
  {
    name: "name",
    type: "text",
    label: "Name",
    placeholder: "Name",
    autocomplete: "name",
    defaultValue: "",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Password",
    autocomplete: "new-password",
    defaultValue: "",
    required: true,
  },
  {
    name: "confirmPassword",
    type: "password",
    label: "Confirm password",
    placeholder: "Confirm password",
    autocomplete: "new-password",
    defaultValue: "",
    required: true,
  },
]);

function handleSubmit(event: FormSubmitEvent<RegisterFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UPageCard>
    <UAuthForm
      title="Register"
      :fields="fields"
      :schema="registerSchema"
      :disabled="loading || socialLoading"
      :loading="loading"
      :submit="{ label: loading ? 'Registering…' : 'Register', block: true }"
      @submit="handleSubmit"
    >
      <template #validation>
        <div v-if="props.error" class="space-y-2" role="alert">
          <UAlert
            v-if="props.error"
            color="error"
            variant="subtle"
            :description="props.error"
          />
        </div>
      </template>
    </UAuthForm>
    <div v-if="props.socialProviders.length" class="mt-5 space-y-4">
      <USeparator label="or continue with" />
      <UButton
        v-for="provider in props.socialProviders"
        :key="provider"
        type="button"
        block
        color="neutral"
        variant="outline"
        :loading="props.socialLoading"
        :disabled="props.loading || props.socialLoading"
        @click="emit('socialSignIn', provider)"
      >
        {{
          props.socialLoading
            ? "Connecting…"
            : `Continue with ${provider === "google" ? "Google" : "GitHub"}`
        }}
      </UButton>
      <UAlert
        v-if="props.socialError"
        color="error"
        variant="subtle"
        role="alert"
        :description="props.socialError"
      />
    </div>
  </UPageCard>
</template>
