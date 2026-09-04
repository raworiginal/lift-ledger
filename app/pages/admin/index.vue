<template>
  <section class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Administration</p>
          <h1 class="mt-2 text-4xl font-bold tracking-tight">Users</h1>
          <p class="mt-2 text-base-content/60">Manage access, account status, and credentials.</p>
        </div>
        <button class="btn btn-primary" type="button" @click="openCreate">Add user</button>
      </header>

      <div v-if="message" role="status" class="alert alert-success alert-soft"><span>{{ message }}</span></div>
      <div v-if="error" role="alert" class="alert alert-error alert-soft"><span>{{ error }}</span></div>

      <div class="stats w-full border border-base-300 bg-base-200 shadow-sm">
        <div class="stat"><div class="stat-title">Total users</div><div class="stat-value text-primary">{{ users.length }}</div><div class="stat-desc">Accounts in Lift Ledger</div></div>
        <div class="stat hidden sm:block"><div class="stat-title">Admins</div><div class="stat-value">{{ adminCount }}</div><div class="stat-desc">Privileged accounts</div></div>
      </div>

      <div class="rounded-box border border-base-300 bg-base-100 shadow-sm">
        <div v-if="loading" class="flex min-h-56 items-center justify-center gap-3 text-base-content/60"><span class="loading loading-spinner loading-md"></span>Loading users</div>
        <div v-else-if="!users.length" class="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center"><h2 class="text-xl font-semibold">No users yet</h2><p class="text-base-content/60">Create the first account to get started.</p><button class="btn btn-primary" type="button" @click="openCreate">Add user</button></div>
         <AdminUserTable v-else :users="users" :current-user-id="user?.id" @edit="openEdit" @toggle-status="confirmStatus" @reset-password="openPassword" @delete="confirmDelete" />
      </div>
    </div>

    <dialog ref="userDialog" class="modal" aria-labelledby="user-form-title">
      <div class="modal-box max-w-lg">
         <AdminUserForm :user="editingUser" :can-change-role="canChangeRole" :busy="saving" :server-error="formError" @submit="saveUser" @cancel="closeDialog(userDialog)" />
      </div>
      <form method="dialog" class="modal-backdrop"><button aria-label="Close user form">close</button></form>
    </dialog>

    <dialog ref="passwordDialog" class="modal" aria-labelledby="password-form-title">
      <div class="modal-box max-w-md">
        <form class="space-y-4" @submit.prevent="resetPassword">
          <div><h2 id="password-form-title" class="text-2xl font-bold">Reset password</h2><p class="mt-1 text-sm text-base-content/60">Set a new password for {{ passwordUser?.name || passwordUser?.email }}.</p></div>
          <div v-if="formError" role="alert" class="alert alert-error alert-soft"><span>{{ formError }}</span></div>
          <label class="form-control"><span class="label"><span class="label-text">New password</span></span><input v-model="password" class="input" type="password" minlength="8" autocomplete="new-password" required /></label>
          <div class="modal-action"><button class="btn btn-ghost" type="button" @click="closeDialog(passwordDialog)">Cancel</button><button class="btn btn-primary" type="submit" :disabled="saving">Reset password</button></div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button aria-label="Close password form">close</button></form>
    </dialog>

    <dialog ref="deleteDialog" class="modal" aria-labelledby="delete-confirmation-title">
      <div class="modal-box max-w-md">
        <h2 id="delete-confirmation-title" class="text-2xl font-bold">Delete user?</h2><p class="py-4 text-base-content/70">This permanently removes {{ deletingUser?.name || deletingUser?.email }} and cannot be undone.</p>
        <div class="modal-action"><button class="btn btn-ghost" type="button" @click="closeDialog(deleteDialog)">Cancel</button><button class="btn btn-error" type="button" :disabled="saving" @click="deleteUser">Delete user</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button aria-label="Close delete confirmation">close</button></form>
    </dialog>

    <dialog ref="statusDialog" class="modal" aria-labelledby="status-confirmation-title">
      <div class="modal-box max-w-md">
        <h2 id="status-confirmation-title" class="text-2xl font-bold">{{ statusUser?.banned ? "Activate user?" : "Suspend user?" }}</h2>
        <p class="py-4 text-base-content/70">{{ statusUser?.banned ? "Allow this account to sign in again?" : "Prevent this account from signing in?" }}</p>
        <div class="modal-action"><button class="btn btn-ghost" type="button" @click="closeDialog(statusDialog)">Cancel</button><button class="btn btn-warning" type="button" :disabled="saving" @click="toggleStatus">{{ statusUser?.banned ? "Activate user" : "Suspend user" }}</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button aria-label="Close status confirmation">close</button></form>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import type { AdminUser } from "~/components/admin/UserTable.vue";

const { user, waitForSession } = useUserSession();
const users = ref<AdminUser[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const message = ref("");
const formError = ref("");
const editingUser = ref<AdminUser | null>(null);
const passwordUser = ref<AdminUser | null>(null);
const deletingUser = ref<AdminUser | null>(null);
const statusUser = ref<AdminUser | null>(null);
const password = ref("");
const userDialog = ref<HTMLDialogElement>();
const passwordDialog = ref<HTMLDialogElement>();
const deleteDialog = ref<HTMLDialogElement>();
const statusDialog = ref<HTMLDialogElement>();
const adminCount = computed(() => users.value.filter((item) => item.role === "admin").length);
const canChangeRole = computed(() => !editingUser.value || (editingUser.value.id !== user.value?.id && !(editingUser.value.role === "admin" && adminCount.value <= 1)));

const apiError = (cause: any) => typeof cause?.data?.message === "string" ? cause.data.message : "The request could not be completed.";
const clearNotice = () => { error.value = ""; message.value = ""; formError.value = ""; };
const loadUsers = async () => {
  loading.value = true;
  try { users.value = await $fetch<AdminUser[]>("/api/admin/users"); } catch (cause) { error.value = apiError(cause); } finally { loading.value = false; }
};
const openCreate = () => { clearNotice(); editingUser.value = null; userDialog.value?.showModal(); };
const openEdit = (selected: AdminUser) => { clearNotice(); editingUser.value = selected; userDialog.value?.showModal(); };
const openPassword = (selected: AdminUser) => { clearNotice(); passwordUser.value = selected; password.value = ""; passwordDialog.value?.showModal(); };
const confirmDelete = (selected: AdminUser) => { clearNotice(); deletingUser.value = selected; deleteDialog.value?.showModal(); };
const confirmStatus = (selected: AdminUser) => { clearNotice(); statusUser.value = selected; statusDialog.value?.showModal(); };
const closeDialog = (dialog?: HTMLDialogElement) => dialog?.close();

const saveUser = async (payload: Record<string, string | boolean>) => {
  saving.value = true; formError.value = "";
  try {
    if (editingUser.value) await $fetch(`/api/admin/users/${editingUser.value.id}`, { method: "PATCH", body: payload });
    else await $fetch("/api/admin/users", { method: "POST", body: payload });
    closeDialog(userDialog.value); message.value = editingUser.value ? "User updated." : "User created."; await loadUsers();
  } catch (cause) { formError.value = apiError(cause); } finally { saving.value = false; }
};

const toggleStatus = async () => {
  const selected = statusUser.value;
  if (!selected) return;
  clearNotice(); saving.value = true;
  try { await $fetch(`/api/admin/users/${selected.id}`, { method: "PATCH", body: { banned: !selected.banned } }); closeDialog(statusDialog.value); message.value = selected.banned ? "User activated." : "User suspended."; await loadUsers(); }
  catch (cause) { error.value = apiError(cause); } finally { saving.value = false; }
};

const resetPassword = async () => {
  if (password.value.length < 8 || !passwordUser.value) return;
  saving.value = true; formError.value = "";
  try { await $fetch(`/api/admin/users/${passwordUser.value.id}/password`, { method: "PUT", body: { password: password.value } }); closeDialog(passwordDialog.value); message.value = "Password reset."; }
  catch (cause) { formError.value = apiError(cause); } finally { saving.value = false; }
};

const deleteUser = async () => {
  if (!deletingUser.value) return;
  saving.value = true;
  try { await $fetch(`/api/admin/users/${deletingUser.value.id}`, { method: "DELETE" }); closeDialog(deleteDialog.value); message.value = "User deleted."; await loadUsers(); }
  catch (cause) { error.value = apiError(cause); } finally { saving.value = false; }
};

onMounted(async () => {
  await waitForSession();
  if (user.value?.role !== "admin") {
    await navigateTo("/app");
    return;
  }
  await loadUsers();
});
</script>
