import { and, eq } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { notes } from "../../db/schema/notes";
import { noteIdSchema, noteInputSchema } from "../../utils/notes";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "private, no-store");
  const { user } = await requireUserSession(event);
  const parsedId = noteIdSchema.safeParse(getRouterParam(event, "id"));
  const parsedNote = noteInputSchema.safeParse(await readBody(event));

  if (!parsedId.success || !parsedNote.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid note." });
  }

  const [note] = await db
    .update(notes)
    .set({ ...parsedNote.data, updatedAt: new Date() })
    .where(and(eq(notes.id, parsedId.data), eq(notes.userId, user.id)))
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    });

  if (!note) {
    throw createError({ statusCode: 404, statusMessage: "Note not found." });
  }

  return note;
});
