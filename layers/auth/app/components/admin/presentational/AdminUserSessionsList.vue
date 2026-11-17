<script setup lang="ts">
import type { AdminUserSession } from "#shared/auth/types/admin";

defineProps<{
  userId: string;
  sessions: AdminUserSession[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  fieldErrors: Record<string, string>;
  actionError: string | null;
  actionLoading: boolean;
  confirmingSessionId: string | null;
  confirmingAll: boolean;
}>();

const emit = defineEmits<{
  revokeSession: [sessionId: string];
  revokeAll: [];
  confirmSession: [sessionId: string];
  cancelSession: [];
  confirmAll: [];
  cancelAll: [];
}>();

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
</script>

<template>
  <div aria-live="polite">
    <p class="text-sm text-muted">User ID: {{ userId }}</p>
    <p v-if="loading" class="mt-4" role="status">Loading active sessions...</p>
    <p
      v-else-if="fieldErrors.userId || fieldErrors.sessionId"
      class="mt-4 text-error"
      role="alert"
    >
      {{ fieldErrors.userId || fieldErrors.sessionId }}
    </p>
    <p v-else-if="error" class="mt-4 text-error" role="alert">{{ error }}</p>
    <template v-else-if="sessions.length === 0">
      <p v-if="actionError" class="mt-4 text-error" role="alert">
        {{ actionError }}
      </p>
      <p class="mt-4" role="status">This user has no active sessions.</p>
    </template>
    <template v-else>
      <p v-if="successMessage" class="mt-4 text-success" role="status">
        {{ successMessage }}
      </p>
      <p v-if="actionError" class="mt-4 text-error" role="alert">
        {{ actionError }}
      </p>
      <h3 class="mt-4 font-semibold">Active sessions</h3>
      <div class="mt-3">
        <UButton
          v-if="!confirmingAll"
          color="error"
          variant="soft"
          size="sm"
          type="button"
          :disabled="actionLoading"
          @click="emit('confirmAll')"
        >
          Revoke all sessions
        </UButton>
        <div
          v-else
          class="rounded border border-error p-3"
          role="group"
          aria-labelledby="revoke-all-confirmation"
        >
          <p id="revoke-all-confirmation">Revoke all sessions for this user?</p>
          <UButton
            color="error"
            variant="soft"
            size="sm"
            class="mt-2"
            type="button"
            :loading="actionLoading"
            @click="emit('revokeAll')"
          >
            {{ actionLoading ? "Revoking..." : "Yes, revoke all" }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="ml-2 mt-2"
            type="button"
            :disabled="actionLoading"
            @click="emit('cancelAll')"
          >
            Cancel
          </UButton>
        </div>
      </div>
      <ul class="mt-2 space-y-3" aria-label="Active sessions">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="rounded-md border border-default p-3"
        >
          <dl class="text-sm">
            <div>
              <dt class="font-medium">Created</dt>
              <dd>{{ formatDate(session.createdAt) }}</dd>
            </div>
            <div class="mt-2">
              <dt class="font-medium">Expires</dt>
              <dd>{{ formatDate(session.expiresAt) }}</dd>
            </div>
          </dl>
          <div class="mt-3">
            <UButton
              v-if="confirmingSessionId !== session.id"
              color="error"
              variant="soft"
              size="sm"
              type="button"
              :disabled="actionLoading"
              @click="emit('confirmSession', session.id)"
            >
              Revoke
            </UButton>
            <div
              v-else
              class="rounded border border-error p-3"
              role="group"
              :aria-labelledby="`revoke-session-confirmation-${session.id}`"
            >
              <p :id="`revoke-session-confirmation-${session.id}`">
                Revoke this session?
              </p>
              <UButton
                color="error"
                variant="soft"
                size="sm"
                class="mt-2"
                type="button"
                :loading="actionLoading"
                @click="emit('revokeSession', session.id)"
              >
                {{ actionLoading ? "Revoking..." : "Yes, revoke" }}
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                class="ml-2 mt-2"
                type="button"
                :disabled="actionLoading"
                @click="emit('cancelSession')"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
