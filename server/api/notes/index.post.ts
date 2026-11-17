import { db } from "@nuxthub/db";
import { noteInputSchema } from "../../utils/notes";
import { notes } from "../../db/schema/notes";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "private, no-store");
  const { user } = await requireUserSession(event);
  const parsed = noteInputSchema.safeParse(await readBody(event));

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid note." });
  }

  const [note] = await db
    .insert(notes)
    .values({ ...parsed.data, userId: user.id })
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    });

  return note;
});
