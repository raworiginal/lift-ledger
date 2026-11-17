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

  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, parsedId.data), eq(notes.userId, user.id)))
    .returning({ id: notes.id });

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Note not found." });
  }

  return { success: true };
});
