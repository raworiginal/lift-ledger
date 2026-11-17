import { z } from "zod";

export const noteIdSchema = z.uuid();

export const noteInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  content: z.string().max(10_000),
});

export type NoteInput = z.infer<typeof noteInputSchema>;
