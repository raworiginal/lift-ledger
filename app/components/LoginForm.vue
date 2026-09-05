<script setup>
import { validateAuthForm } from "../utils/auth-validation.mjs";

const emit = defineEmits(["switch-to-signup"]);
const identifier = ref("");
const password = ref("");
const pending = ref(false);
const error = ref("");

const submit = async () => {
  error.value = validateAuthForm({
    mode: "sign-in",
    identifier: identifier.value,
    password: password.value,
  });
  if (error.value) return;

  const authClient = useAuthClient();
  if (!authClient) {
    error.value = "Authentication is unavailable. Please try again.";
    return;
  }

  pending.value = true;
  try {
    const result = identifier.value.includes("@")
      ? await authClient.signIn.email({
          email: identifier.value,
          password: password.value,
          callbackURL: "/app",
        })
      : await authClient.signIn.username({
          username: identifier.value,
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
  <fieldset
    class="fieldset w-full max-w-sm rounded-box border border-base-300 bg-base-200 p-4"
  >
    <legend class="fieldset-legend">Login</legend>

    <form class="space-y-2" @submit.prevent="submit">
      <label class="label" for="login-identifier">Username or email</label>
      <input
        v-model="identifier"
        class="input w-full"
        id="login-identifier"
        type="text"
        placeholder="Username or email"
        autocomplete="username"
        required
      />

      <label class="label" for="login-password">Password</label>
      <input
        v-model="password"
        class="input w-full"
        id="login-password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        minlength="8"
        required
      />

      <div v-if="error" role="alert" class="alert alert-error text-sm">
        <span>{{ error }}</span>
      </div>

      <button
        class="btn btn-neutral mt-4 w-full"
        type="submit"
        :disabled="pending"
      >
        <span v-if="pending" class="loading loading-spinner loading-sm" />
        {{ pending ? "Signing in..." : "Sign in" }}
      </button>
    </form>

    <button
      class="btn btn-link btn-sm self-center"
      type="button"
      @click="emit('switch-to-signup')"
    >
      Need an account? Sign up
    </button>
  </fieldset>
</template>
