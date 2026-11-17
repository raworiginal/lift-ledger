<script setup lang="ts">
const password = defineModel<string>("password", {
  required: true,
});

const props = withDefaults(
  defineProps<{
    error?: string;
    id?: string;
    label?: string;
    name?: string;
    placeholder?: string;
    autocomplete?: string;
  }>(),
  {
    id: "password",
    label: "Password",
    name: "password",
    placeholder: "Password",
    autocomplete: "new-password",
  },
);
</script>

<template>
  <UFormField :label="props.label" :name="props.name" :error="props.error">
    <UInput
      :id="props.id"
      v-model="password"
      :name="props.name"
      type="password"
      :placeholder="props.placeholder"
      :autocomplete="props.autocomplete"
      class="w-full"
    />
  </UFormField>
</template>
