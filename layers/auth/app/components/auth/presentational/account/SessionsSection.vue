<script setup lang="ts">
import type { UserSession } from "#shared/auth/types/account";

const { sessions, loading, loadError, action } = defineProps<{
  sessions: readonly UserSession[];
  loading: boolean;
  loadError: string | null;
  action: boolean;
}>();

const emit = defineEmits<{
  revokeSession: [sessionId: string];
  revokeOtherSessions: [];
}>();

const confirmingSession = ref<string | null>(null);
const confirmOtherSessions = ref(false);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
</script>

<template>
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
                emit('revokeSession', session.id);
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
            emit('revokeOtherSessions');
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
</template>
