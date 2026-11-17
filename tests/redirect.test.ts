import assert from "node:assert/strict";
import test from "node:test";
import { getSafeLocalRedirect } from "../layers/auth/shared/auth/redirect";

test("local callback paths and query strings are preserved", () => {
  assert.equal(
    getSafeLocalRedirect("/app/notes?sort=recent#top"),
    "/app/notes?sort=recent#top",
  );
});

test("external, malformed, and non-string redirects use the fallback", () => {
  for (const candidate of [
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example",
    "/%2f%2fevil.example",
    undefined,
    ["/app"],
  ]) {
    assert.equal(getSafeLocalRedirect(candidate), "/app");
  }
});
