<script setup lang="ts">
import type { SocialProvider } from "#shared/auth/types/auth";

const { user } = useUserSession();
const {
  accounts,
  sessions,
  providers,
  loading,
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

const confirmingUnlink = ref<string | null>(null);
const confirmingSession = ref<string | null>(null);
const confirmOtherSessions = ref(false);
const confirmDelete = ref(false);
const confirmationEmail = ref("");
const deletePassword = ref("");

const canDelete = computed(
  () =>
    confirmationEmail.value.trim().toLowerCase() ===
    user.value?.email.toLowerCase(),
);

onMounted(load);

function providerLabel(provider: string) {
  return provider === "credential"
    ? "Email and password"
    : provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function beginDelete() {
  confirmDelete.value = true;
  actionError.value = null;
}

async function handleDelete() {
  if (!canDelete.value) return;
  await deleteAccount(hasPassword.value ? deletePassword.value : undefined);
  deletePassword.value = "";
}

function providerIsLinked(provider: SocialProvider) {
  return accounts.value.some((account) => account.providerId === provider);
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <Fieldset title="Sign-in methods">
      <p class="text-sm text-muted">
        Link another method before removing one. Better Auth prevents unlinking
        the last available sign-in method.
      </p>
      <p v-if="loading" class="mt-3" role="status">
        Loading linked accounts...
      </p>
      <p v-else-if="loadError" class="mt-3 text-error" role="alert">
        {{ loadError }}
      </p>
      <ul v-else class="mt-3 space-y-2">
        <li
          v-for="account in accounts"
          :key="account.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-default p-3"
        >
          <span>{{ providerLabel(account.providerId) }}</span>
          <div v-if="account.providerId !== 'credential'">
            <UButton
              v-if="confirmingUnlink !== account.id"
              type="button"
              color="error"
              variant="soft"
              size="sm"
              :disabled="action"
              @click="confirmingUnlink = account.id"
            >
              Unlink
            </UButton>
            <div v-else class="flex items-center gap-2">
              <span class="text-sm">Unlink this method?</span>
              <UButton
                type="button"
                color="error"
                variant="soft"
                size="sm"
                :loading="action"
                @click="
                  unlinkAccount(account.id);
                  confirmingUnlink = null;
                "
              >
                Confirm
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                :disabled="action"
                @click="confirmingUnlink = null"
              >
                Cancel
              </UButton>
            </div>
          </div>
          <span v-else class="text-sm text-muted">Managed with password</span>
        </li>
      </ul>
      <div v-if="providers.length" class="mt-4 flex flex-wrap gap-2">
        <UButton
          v-for="provider in providers"
          :key="provider"
          type="button"
          color="neutral"
          variant="outline"
          :disabled="action || providerIsLinked(provider)"
          :loading="action"
          @click="linkAccount(provider)"
        >
          {{
            providerIsLinked(provider)
              ? `${providerLabel(provider)} linked`
              : `Link ${providerLabel(provider)}`
          }}
        </UButton>
      </div>
    </Fieldset>

    <Fieldset title="Active sessions">
      <p class="text-sm text-muted">
        Review devices signed in to your account and revoke access you no longer
        need.
      </p>
      <p v-if="loading" class="mt-3" role="status">Loading sessions...</p>
      <ul v-else class="mt-3 space-y-3">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="rounded-md border border-default p-3"
        >
          <p class="font-medium">
            {{
              session.current
                ? "This device"
                : session.userAgent || "Other device"
            }}
          </p>
          <p class="mt-1 text-sm text-muted">
            Created {{ formatDate(session.createdAt) }} · Expires
            {{ formatDate(session.expiresAt) }}
          </p>
          <div class="mt-2">
            <template v-if="confirmingSession === session.id">
              <span class="mr-2 text-sm">Revoke this session?</span>
              <UButton
                type="button"
                color="error"
                variant="soft"
                size="sm"
                :loading="action"
                @click="
                  revokeSession(session.id);
                  confirmingSession = null;
                "
              >
                Confirm
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                class="ml-2"
                :disabled="action"
                @click="confirmingSession = null"
              >
                Cancel
              </UButton>
            </template>
            <UButton
              v-else
              type="button"
              color="error"
              variant="soft"
              size="sm"
              :disabled="action"
              @click="confirmingSession = session.id"
            >
              Revoke session
            </UButton>
          </div>
        </li>
      </ul>
      <p
        v-if="!loading && sessions.length === 0 && !loadError"
        class="mt-3 text-sm"
      >
        No active sessions found.
      </p>
      <div v-if="sessions.some((session) => !session.current)" class="mt-4">
        <template v-if="confirmOtherSessions">
          <span class="mr-2 text-sm">Revoke all other sessions?</span>
          <UButton
            type="button"
            color="error"
            variant="soft"
            size="sm"
            :loading="action"
            @click="
              revokeOtherSessions();
              confirmOtherSessions = false;
            "
          >
            Confirm
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="ml-2"
            :disabled="action"
            @click="confirmOtherSessions = false"
          >
            Cancel
          </UButton>
        </template>
        <UButton
          v-else
          type="button"
          color="error"
          variant="soft"
          :disabled="action"
          @click="confirmOtherSessions = true"
        >
          Revoke other sessions
        </UButton>
      </div>
    </Fieldset>

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

    <Fieldset title="Delete account">
      <p class="text-sm text-error">
        Deleting your account is permanent and removes your profile and sign-in
        sessions. This action cannot be undone.
      </p>
      <template v-if="confirmDelete">
        <UFormField
          label="Type your account email to confirm"
          name="confirmationEmail"
        >
          <UInput
            v-model="confirmationEmail"
            type="email"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>
        <PasswordField
          v-if="hasPassword"
          v-model:password="deletePassword"
          id="delete-account-password"
          label="Current password"
          name="deletePassword"
          autocomplete="current-password"
        />
        <p v-else class="text-sm text-muted">
          Your sign-in must be recent. If it is not, sign in again before
          deleting your account.
        </p>
        <div class="mt-3 flex gap-2">
          <UButton
            type="button"
            color="error"
            :disabled="
              loading ||
              !!loadError ||
              !canDelete ||
              (hasPassword && !deletePassword)
            "
            :loading="deleting"
            @click="handleDelete"
          >
            Permanently delete account
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :disabled="deleting"
            @click="
              confirmDelete = false;
              confirmationEmail = '';
              deletePassword = '';
            "
          >
            Cancel
          </UButton>
        </div>
      </template>
      <UButton
        v-else
        type="button"
        color="error"
        variant="soft"
        :disabled="loading || !!loadError"
        @click="beginDelete"
      >
        Delete account
      </UButton>
    </Fieldset>
  </div>
</template>
