<script setup lang="ts">
const { user } = useUserSession();
const authMode = useRuntimeConfig().public.authMode;
const {
  loading: profileLoading,
  error: profileError,
  successMessage: profileSuccessMessage,
  submit: submitProfile,
} = useProfile();
const {
  loading: passwordLoading,
  error: passwordError,
  successMessage: passwordSuccessMessage,
  submit: submitPassword,
} = useChangePassword();

const toast = useToast();

watch(profileSuccessMessage, (message) => {
  if (message) toast.add({ title: message, color: "success" });
});

watch(passwordSuccessMessage, (message) => {
  if (message) toast.add({ title: message, color: "success" });
});
</script>

<template>
  <div v-if="user" class="flex flex-col gap-4 p-4">
    <ProfileForm
      :user="{ name: user.name, image: user.image ?? '' }"
      :loading="profileLoading"
      :error="profileError"
      @submit="submitProfile"
    />
    <ChangePasswordForm
      v-if="authMode !== 'social-only'"
      :loading="passwordLoading"
      :error="passwordError"
      @submit="submitPassword"
    />
  </div>
</template>
