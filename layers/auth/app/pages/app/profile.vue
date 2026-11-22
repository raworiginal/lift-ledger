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

const {
  accounts,
  sessions,
  providers,
  loading: settingsLoading,
  action,
  deleting,
  loadError,
  actionError,
  successMessage,
  hasPassword,
  load,
  clearActionError,
  linkAccount,
  unlinkAccount,
  revokeSession,
  revokeOtherSessions,
  deleteAccount,
} = useAccountSettings();

const toast = useToast();

watch(profileSuccessMessage, (message) => {
  if (message) toast.add({ title: message, color: "success" });
});

watch(passwordSuccessMessage, (message) => {
  if (message) toast.add({ title: message, color: "success" });
});

onMounted(load);
</script>

<template>
  <div class="flex flex-col gap-4">
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
    <div class="flex flex-col gap-4 p-4">
      <SignInMethodsSection
        :accounts="accounts"
        :providers="providers"
        :loading="settingsLoading"
        :load-error="loadError"
        :action="action"
        @link-account="linkAccount"
        @unlink-account="unlinkAccount"
      />
      <SessionsSection
        :sessions="sessions"
        :loading="settingsLoading"
        :load-error="loadError"
        :action="action"
        @revoke-session="revokeSession"
        @revoke-other-sessions="revokeOtherSessions"
      />
      <UAlert
        v-if="successMessage"
        color="success"
        variant="soft"
        :description="successMessage"
        title="Account updated"
      />
      <UAlert
        v-if="actionError"
        color="error"
        variant="soft"
        :description="actionError"
        title="Action failed"
      />
      <DeleteAccountSection
        :user-email="user?.email ?? ''"
        :has-password="hasPassword"
        :loading="settingsLoading"
        :load-error="loadError"
        :deleting="deleting"
        @clear-action-error="clearActionError"
        @delete-account="deleteAccount"
      />
    </div>
  </div>
</template>
