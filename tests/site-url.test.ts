import assert from "node:assert/strict";
import { test } from "node:test";
import { readSiteUrl } from "../server/utils/site-url";

test("accepts an http or https site URL", () => {
  assert.equal(
    readSiteUrl({ NUXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    "http://localhost:3000",
  );
  assert.equal(
    readSiteUrl({ NUXT_PUBLIC_SITE_URL: " https://lift.example.com " }),
    "https://lift.example.com",
  );
});

test("rejects a missing or blank site URL", () => {
  assert.throws(() => readSiteUrl({}), /NUXT_PUBLIC_SITE_URL is not set/);
  assert.throws(
    () => readSiteUrl({ NUXT_PUBLIC_SITE_URL: "   " }),
    /NUXT_PUBLIC_SITE_URL is not set/,
  );
});

test("rejects a value that is not an http or https URL", () => {
  assert.throws(
    () => readSiteUrl({ NUXT_PUBLIC_SITE_URL: "not a url" }),
    /must be a valid URL/,
  );
  assert.throws(
    () => readSiteUrl({ NUXT_PUBLIC_SITE_URL: "ftp://example.com" }),
    /must start with http/,
  );
});
