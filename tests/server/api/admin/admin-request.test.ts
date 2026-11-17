import assert from "node:assert/strict";
import test from "node:test";
import { getAdminRequestRejection } from "../../../../layers/auth/server/utils/admin-request";

const requestOrigin = "https://admin.example.test";

function headers(
  overrides: Record<string, string> = {},
): Record<string, string | undefined> {
  return {
    origin: requestOrigin,
    "content-type": "application/json; charset=utf-8",
    "sec-fetch-site": "same-origin",
    ...overrides,
  };
}

test("allows same-origin JSON admin requests", () => {
  assert.equal(getAdminRequestRejection(headers(), requestOrigin), undefined);
});

test("rejects non-JSON request bodies", () => {
  assert.equal(
    getAdminRequestRejection(
      headers({ "content-type": "application/x-www-form-urlencoded" }),
      requestOrigin,
    ),
    "content-type",
  );
});

test("rejects missing, null, malformed, and untrusted origins", () => {
  for (const origin of [
    undefined,
    "null",
    "not a URL",
    "https://evil.example.test",
  ]) {
    const requestHeaders = headers();
    if (origin === undefined) {
      delete requestHeaders.origin;
    } else {
      requestHeaders.origin = origin;
    }
    assert.equal(
      getAdminRequestRejection(requestHeaders, requestOrigin),
      "origin",
    );
  }
});

test("rejects cross-site Fetch Metadata even if Origin matches", () => {
  assert.equal(
    getAdminRequestRejection(
      headers({ "sec-fetch-site": "same-site" }),
      requestOrigin,
    ),
    "origin",
  );
});

test("does not accept an Origin value with a path", () => {
  assert.equal(
    getAdminRequestRejection(
      headers({ origin: `${requestOrigin}/path` }),
      requestOrigin,
    ),
    "origin",
  );
});
