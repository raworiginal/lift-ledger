<script setup lang="ts">
const { userEmail, hasPassword, loading, loadError, deleting } = defineProps<{
  userEmail: string;
  hasPassword: boolean;
  loading: boolean;
  loadError: string | null;
  deleting: boolean;
}>();

const emit = defineEmits<{
  clearActionError: [];
  deleteAccount: [password: string | undefined];
}>();

const confirmDelete = ref(false);
const confirmationEmail = ref("");
const deletePassword = ref("");

const canDelete = computed(
  () =>
    confirmationEmail.value.trim().toLowerCase() === userEmail.toLowerCase(),
);

watch(
  () => deleting,
  (isDeleting, wasDeleting) => {
    if (wasDeleting && !isDeleting) deletePassword.value = "";
  },
);

function beginDelete() {
  confirmDelete.value = true;
  emit("clearActionError");
}

function cancelDelete() {
  confirmDelete.value = false;
  confirmationEmail.value = "";
  deletePassword.value = "";
}

function handleDelete() {
  if (!canDelete.value) return;
  emit("deleteAccount", hasPassword ? deletePassword.value : undefined);
}
</script>

<template>
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
        Your sign-in must be recent. If it is not, sign in again before deleting
        your account.
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
          @click="cancelDelete"
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
</template>
