<template>
  <form class="space-y-4" novalidate @submit.prevent="submit">
    <div>
      <h2 id="user-form-title" class="text-2xl font-bold">{{ user ? "Edit user" : "Create user" }}</h2>
      <p class="mt-1 text-sm text-base-content/60">
        {{ user ? "Update account details and access." : "Add a new Lift Ledger account." }}
      </p>
    </div>

    <div v-if="error" role="alert" class="alert alert-error alert-soft">
      <span>{{ error }}</span>
    </div>

    <div v-if="validationMessage" role="alert" class="alert alert-error alert-soft">
      <span>{{ validationMessage }}</span>
    </div>

    <label class="form-control w-full">
      <span class="label"><span class="label-text">Name</span></span>
      <input v-model="form.name" class="input w-full" :class="{ 'input-error': errors.name }" type="text" autocomplete="name" required :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'name-error' : undefined" @input="errors.name = ''" />
      <span v-if="errors.name" id="name-error" class="label-text-alt text-error">{{ errors.name }}</span>
    </label>

    <label class="form-control w-full">
      <span class="label"><span class="label-text">Email</span></span>
      <input v-model="form.email" class="input w-full" :class="{ 'input-error': errors.email }" type="email" autocomplete="email" required :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'email-error' : undefined" @input="errors.email = ''" />
      <span v-if="errors.email" id="email-error" class="label-text-alt text-error">{{ errors.email }}</span>
    </label>

    <label v-if="!user" class="form-control w-full">
      <span class="label"><span class="label-text">Password</span></span>
      <input v-model="form.password" class="input w-full" :class="{ 'input-error': errors.password }" type="password" minlength="8" autocomplete="new-password" required :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'password-error' : undefined" @input="errors.password = ''" />
      <span v-if="errors.password" id="password-error" class="label-text-alt text-error">{{ errors.password }}</span>
    </label>

    <label class="form-control w-full">
      <span class="label"><span class="label-text">Role</span></span>
      <select v-model="form.role" class="select w-full" :disabled="!canChangeRole">
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <span v-if="!canChangeRole" class="label"><span class="label-text-alt text-warning">Your own role and the last admin cannot be changed here.</span></span>
    </label>

    <label v-if="user" class="flex cursor-pointer items-center gap-3 rounded-box border border-base-300 p-3">
      <input v-model="form.banned" class="toggle toggle-warning" type="checkbox" />
      <span><span class="block font-medium">Suspended</span><span class="text-sm text-base-content/60">Prevent this account from signing in.</span></span>
    </label>

    <div class="modal-action">
      <button class="btn btn-ghost" type="button" :disabled="busy" @click="$emit('cancel')">Cancel</button>
      <button class="btn btn-primary" type="submit" :disabled="busy">
        <span v-if="busy" class="loading loading-spinner loading-sm"></span>
        {{ user ? "Save changes" : "Create user" }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string | null;
  banned?: boolean | null;
};

const props = defineProps<{
  user?: AdminUser | null;
  canChangeRole?: boolean;
  busy?: boolean;
  serverError?: string;
}>();

const emit = defineEmits<{
  submit: [payload: Record<string, string | boolean>];
  cancel: [];
}>();

const error = computed(() => props.serverError || "");
const errors = reactive({ name: "", email: "", password: "" });
const validationMessage = computed(() => errors.name || errors.email || errors.password);
const form = reactive({
  name: props.user?.name || "",
  email: props.user?.email || "",
  password: "",
  role: props.user?.role === "admin" ? "admin" : "user",
  banned: Boolean(props.user?.banned),
});

watch(() => props.user, (user) => {
  form.name = user?.name || "";
  form.email = user?.email || "";
  form.password = "";
  form.role = user?.role === "admin" ? "admin" : "user";
  form.banned = Boolean(user?.banned);
});

const submit = () => {
  errors.name = form.name.trim() ? "" : "Name is required.";
  errors.email = !form.email.trim() ? "Email is required." : !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? "Enter a valid email address." : "";
  errors.password = !props.user && form.password.length < 8 ? "Password must be at least 8 characters." : "";
  if (errors.name || errors.email || errors.password) return;

  const payload: Record<string, string | boolean> = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
  };
  if (props.user) payload.banned = form.banned;
  if (!props.user) payload.password = form.password;
  emit("submit", payload);
};
</script>
