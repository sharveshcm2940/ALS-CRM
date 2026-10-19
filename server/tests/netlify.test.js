import { test, after } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../../netlify/functions/api.mjs";
const { pool } = await import("../config/index.js");
const event = (path, method = "GET", headers = {}, body = null) => ({
  httpMethod: method,
  path,
  headers: {
    host: "als-crm-example.netlify.app",
    "x-forwarded-proto": "https",
    ...headers,
  },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  isBase64Encoded: false,
  body,
  requestContext: { identity: { sourceIp: "127.0.0.1" } },
});
after(() => pool.end());
test("Netlify rewrites preserve API routing and issue secure same-origin cookies", async () => {
  const context = {};
  const result = await handler(
    event("/.netlify/functions/api/api/auth/csrf"),
    context,
  );
  assert.equal(result.statusCode, 200);
  assert.match(JSON.parse(result.body).data.csrf, /^[a-f0-9]{64}$/);
  const cookie = []
    .concat(
      result.headers?.["set-cookie"] ||
        result.multiValueHeaders?.["set-cookie"] ||
        result.multiValueHeaders?.["Set-Cookie"] ||
        [],
    )
    .join(";");
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.equal(context.callbackWaitsForEmptyEventLoop, false);
});
test("original API paths and unauthenticated protection work inside the function", async () => {
  const result = await handler(event("/api/auth/me"), {});
  assert.equal(result.statusCode, 401);
  assert.match(JSON.parse(result.body).error, /session has expired/);
});
test("Netlify function rejects non-API paths and missing CSRF tokens", async () => {
  assert.equal(
    (await handler(event("/.netlify/functions/api/"), {})).statusCode,
    404,
  );
  assert.equal(
    (
      await handler(
        event(
          "/.netlify/functions/api/api/auth/login",
          "POST",
          { "content-type": "application/json" },
          "{}",
        ),
        {},
      )
    ).statusCode,
    403,
  );
});
test("unrelated Netlify sites are not trusted origins", async () => {
  const result = await handler(
    event("/api/auth/csrf", "GET", {
      origin: "https://unrelated-example.netlify.app",
    }),
    {},
  );
  assert.equal(result.statusCode, 403);
});
