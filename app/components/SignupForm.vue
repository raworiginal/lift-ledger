<script setup>
import { validateAuthForm } from "../utils/auth-validation.mjs";

const emit = defineEmits(["switch-to-login"]);
const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const pending = ref(false);
const error = ref("");

const submit = async () => {
  error.value = validateAuthForm({
    mode: "sign-up",
    username: username.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
  if (error.value) return;

  const authClient = useAuthClient();
  if (!authClient) {
    error.value = "Authentication is unavailable. Please try again.";
    return;
  }

  pending.value = true;
  try {
    const result = await authClient.signUp.email({
      username: username.value,
      email: email.value,
      password: password.value,
      callbackURL: "/app",
    });

    if (result.error) {
      error.value = result.error.message || "Authentication failed.";
      return;
    }

    await navigateTo("/app");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "Authentication failed.";
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <fieldset class="fieldset w-full max-w-sm rounded-box border border-base-300 bg-base-200 p-4">
    <legend class="fieldset-legend">Sign up</legend>

    <form class="space-y-2" @submit.prevent="submit">
      <label class="label" for="signup-username">Username</label>
      <input
        v-model="username"
        class="input w-full"
        id="signup-username"
        type="text"
        placeholder="Username"
        autocomplete="username"
        required
      />

      <label class="label" for="signup-email">Email</label>
      <input
        v-model="email"
        class="input w-full"
        id="signup-email"
        type="email"
        placeholder="Email"
        autocomplete="email"
        required
      />

      <label class="label" for="signup-password">Password</label>
      <input
        v-model="password"
        class="input w-full"
        id="signup-password"
        type="password"
        placeholder="Password"
        autocomplete="new-password"
        minlength="8"
        required
      />

      <label class="label" for="signup-confirm-password">Confirm password</label>
      <input
        v-model="confirmPassword"
        class="input w-full"
        id="signup-confirm-password"
        type="password"
        placeholder="Confirm password"
        autocomplete="new-password"
        minlength="8"
        required
      />

      <div v-if="error" role="alert" class="alert alert-error text-sm">
        <span>{{ error }}</span>
      </div>

      <button class="btn btn-neutral mt-4 w-full" type="submit" :disabled="pending">
        <span v-if="pending" class="loading loading-spinner loading-sm" />
        {{ pending ? "Creating account..." : "Create account" }}
      </button>
    </form>

    <button class="btn btn-link btn-sm self-center" type="button" @click="emit('switch-to-login')">
      Already have an account? Sign in
    </button>
  </fieldset>
</template>
