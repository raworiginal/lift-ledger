<script setup lang="ts">
import type { BanAdminUserFormData } from "#shared/auth/types/admin";
import { banAdminUserSchema } from "#shared/auth/schemas/admin";
import type { FormSubmitEvent } from "@nuxt/ui";

const formSchema = banAdminUserSchema.omit({ userId: true });

const props = defineProps<{
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [input: BanAdminUserFormData];
}>();

const form = reactive<BanAdminUserFormData>({
  banReason: "",
  duration: undefined,
  durationUnit: "days",
});

function handleSubmit(event: FormSubmitEvent<BanAdminUserFormData>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    id="admin-ban-user-form"
    :schema="formSchema"
    :state="form"
    :disabled="props.loading"
    class="space-y-4"
    @submit="handleSubmit"
  >
    <p v-if="props.error" class="text-error" role="alert">
      {{ props.error }}
    </p>
    <UFormField label="Reason" name="banReason">
      <UTextarea
        id="admin-ban-user-reason"
        v-model="form.banReason"
        name="banReason"
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <UFormField label="Duration (leave blank for permanent)" name="duration">
        <UInput
          id="admin-ban-user-duration"
          v-model.number="form.duration"
          class="w-full"
          name="duration"
          type="number"
          min="0"
          step="any"
        />
      </UFormField>
      <UFormField label="Unit" name="durationUnit">
        <USelect
          id="admin-ban-user-duration-unit"
          v-model="form.durationUnit"
          name="durationUnit"
          :items="[
            { label: 'Seconds', value: 'seconds' },
            { label: 'Minutes', value: 'minutes' },
            { label: 'Hours', value: 'hours' },
            { label: 'Days', value: 'days' },
          ]"
        />
      </UFormField>
    </div>
  </UForm>
</template>
