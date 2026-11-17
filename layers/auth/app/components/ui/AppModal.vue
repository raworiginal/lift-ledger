<script setup lang="ts">
import { computed } from "vue";

const open = defineModel<boolean>("open", { required: true });

const props = withDefaults(
  defineProps<{
    title: string;
    closeDisabled?: boolean;
  }>(),
  {
    closeDisabled: false,
  },
);

const modalOpen = computed({
  get: () => open.value,
  set: (value: boolean) => {
    if (value || !props.closeDisabled) open.value = value;
  },
});
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="props.title"
    :close="!props.closeDisabled"
    :dismissible="!props.closeDisabled"
  >
    <template #body="{ close }">
      <slot :close="close" />
    </template>
    <template v-if="$slots.footer" #footer="{ close }">
      <slot name="footer" :close="close" />
    </template>
  </UModal>
</template>
