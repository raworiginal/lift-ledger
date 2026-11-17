import assert from "node:assert/strict";
import test from "node:test";
import { noteIdSchema, noteInputSchema } from "../server/utils/notes";

test("note input trims titles and accepts bounded content", () => {
  const result = noteInputSchema.safeParse({
    title: "  A private note  ",
    content: "Remember this",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.title, "A private note");
});

test("note input rejects empty or oversized fields and owner injection", () => {
  assert.equal(
    noteInputSchema.safeParse({ title: " ", content: "" }).success,
    false,
  );
  assert.equal(
    noteInputSchema.safeParse({ title: "x".repeat(121), content: "" }).success,
    false,
  );
  assert.equal(
    noteInputSchema.safeParse({ title: "Valid", content: "x".repeat(10_001) })
      .success,
    false,
  );
  assert.equal(
    noteInputSchema.safeParse({ title: "Valid", content: "", userId: "other" })
      .success,
    false,
  );
});

test("note IDs must be UUIDs", () => {
  assert.equal(
    noteIdSchema.safeParse("5cc4c7a4-1d16-4bdb-9a68-b875b42da6ef").success,
    true,
  );
  assert.equal(noteIdSchema.safeParse("another-users-note").success, false);
});
