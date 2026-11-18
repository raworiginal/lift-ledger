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

function clearActionError() {
  actionError.value = null;
}
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
    <AccountSettings
      :user-email="user?.email ?? ''"
      :accounts="accounts"
      :sessions="sessions"
      :providers="providers"
      :loading="settingsLoading"
      :action="action"
      :deleting="deleting"
      :load-error="loadError"
      :action-error="actionError"
      :success-message="successMessage"
      :has-password="hasPassword"
      :delete-account="deleteAccount"
      @link-account="linkAccount"
      @unlink-account="unlinkAccount"
      @revoke-session="revokeSession"
      @revoke-other-sessions="revokeOtherSessions"
      @clear-action-error="clearActionError"
    />
  </div>
</template>
