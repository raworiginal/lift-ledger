<script setup lang="ts">
import type { SocialProvider } from "#shared/auth/types/auth";
import type { LinkedAccount } from "#shared/auth/types/account";

const { accounts, providers, loading, loadError, action } = defineProps<{
  accounts: readonly LinkedAccount[];
  providers: readonly SocialProvider[];
  loading: boolean;
  loadError: string | null;
  action: boolean;
}>();

const emit = defineEmits<{
  linkAccount: [provider: SocialProvider];
  unlinkAccount: [accountId: string];
}>();

const confirmingUnlink = ref<string | null>(null);

function providerLabel(provider: string) {
  return provider === "credential"
    ? "Email and password"
    : provider.charAt(0).toUpperCase() + provider.slice(1);
}

function providerIsLinked(provider: SocialProvider) {
  return accounts.some((account) => account.providerId === provider);
}
</script>

<template>
  <Fieldset title="Sign-in methods">
    <p class="text-sm text-muted">
      Link another method before removing one. Better Auth prevents unlinking
      the last available sign-in method.
    </p>
    <p v-if="loading" class="mt-3" role="status">Loading linked accounts...</p>
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
                emit('unlinkAccount', account.id);
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
        @click="emit('linkAccount', provider)"
      >
        {{
          providerIsLinked(provider)
            ? `${providerLabel(provider)} linked`
            : `Link ${providerLabel(provider)}`
        }}
      </UButton>
    </div>
  </Fieldset>
</template>
