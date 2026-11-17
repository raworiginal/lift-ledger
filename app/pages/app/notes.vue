<script setup lang="ts">
const {
  data: notes,
  status,
  error,
  refresh,
} = await useFetch("/api/notes", {
  default: () => [],
});

const title = ref("");
const content = ref("");
const editingId = ref<string | null>(null);
const saving = ref(false);
const deletingId = ref<string | null>(null);
const actionError = ref("");

function editNote(note: NonNullable<typeof notes.value>[number]) {
  editingId.value = note.id;
  title.value = note.title;
  content.value = note.content;
  actionError.value = "";
}

function resetForm() {
  editingId.value = null;
  title.value = "";
  content.value = "";
}

async function saveNote() {
  saving.value = true;
  actionError.value = "";

  try {
    const body = { title: title.value, content: content.value };
    if (editingId.value) {
      await $fetch(`/api/notes/${editingId.value}`, { method: "PUT", body });
    } else {
      await $fetch("/api/notes", { method: "POST", body });
    }

    resetForm();
    await refresh();
  } catch {
    actionError.value = "Your note could not be saved. Please try again.";
  } finally {
    saving.value = false;
  }
}

async function deleteNote(id: string) {
  deletingId.value = id;
  actionError.value = "";

  try {
    await $fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (editingId.value === id) resetForm();
    await refresh();
  } catch {
    actionError.value = "Your note could not be deleted. Please try again.";
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="mx-auto max-w-3xl space-y-8">
      <header class="space-y-2">
        <NuxtLink to="/app" class="text-sm font-medium text-primary">
          Back to your account
        </NuxtLink>
        <h1 class="text-3xl font-semibold text-highlighted">Private notes</h1>
        <p class="text-muted">
          Notes are private to your account and can only be accessed while you
          are signed in.
        </p>
      </header>

      <UCard>
        <form class="space-y-4" @submit.prevent="saveNote">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ editingId ? "Edit note" : "New note" }}
          </h2>
          <UFormField label="Title" name="title">
            <UInput
              v-model="title"
              required
              maxlength="120"
              placeholder="A note to remember"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Note" name="content">
            <UTextarea
              v-model="content"
              maxlength="10000"
              :rows="5"
              placeholder="Write something…"
              class="w-full"
            />
          </UFormField>
          <p v-if="actionError" role="alert" class="text-sm text-error">
            {{ actionError }}
          </p>
          <div class="flex gap-2">
            <UButton type="submit" :loading="saving">
              {{ editingId ? "Save changes" : "Create note" }}
            </UButton>
            <UButton
              v-if="editingId"
              type="button"
              color="neutral"
              variant="outline"
              @click="resetForm"
            >
              Cancel
            </UButton>
          </div>
        </form>
      </UCard>

      <section class="space-y-4" aria-labelledby="notes-heading">
        <h2 id="notes-heading" class="text-xl font-semibold text-highlighted">
          Your notes
        </h2>
        <p v-if="error" role="alert" class="text-sm text-error">
          Your notes could not be loaded. Please refresh the page.
        </p>
        <p v-else-if="status === 'pending'" class="text-sm text-muted">
          Loading your notes…
        </p>
        <p v-else-if="notes.length === 0" class="text-sm text-muted">
          You don’t have any notes yet.
        </p>
        <UCard v-for="note in notes" :key="note.id">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0 space-y-2">
              <h3 class="break-words font-semibold text-highlighted">
                {{ note.title }}
              </h3>
              <p class="whitespace-pre-wrap break-words text-sm text-muted">
                {{ note.content || "No additional details." }}
              </p>
            </div>
            <div class="flex shrink-0 gap-2">
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                :disabled="saving || deletingId !== null"
                @click="editNote(note)"
              >
                Edit
              </UButton>
              <UButton
                type="button"
                color="error"
                variant="outline"
                :loading="deletingId === note.id"
                :disabled="
                  saving || (deletingId !== null && deletingId !== note.id)
                "
                @click="deleteNote(note.id)"
              >
                Delete
              </UButton>
            </div>
          </div>
        </UCard>
      </section>
    </div>
  </UContainer>
</template>
