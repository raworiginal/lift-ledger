import { desc, eq } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { notes } from "../../db/schema/notes";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  const { user } = await requireUserSession(event);

  return db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.updatedAt));
});
