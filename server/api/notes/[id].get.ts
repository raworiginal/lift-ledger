import { and, eq } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { notes } from "../../db/schema/notes";
import { noteIdSchema } from "../../utils/notes";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  const { user } = await requireUserSession(event);
  const parsedId = noteIdSchema.safeParse(getRouterParam(event, "id"));

  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Note not found." });
  }

  const [note] = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.id, parsedId.data), eq(notes.userId, user.id)))
    .limit(1);

  if (!note) {
    throw createError({ statusCode: 404, statusMessage: "Note not found." });
  }

  return note;
});
