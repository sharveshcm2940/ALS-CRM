import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { api, downloadReport, ApiError } from "../../src/services/api.js";
import { formatDate, calendarDate } from "../../src/utils/dates.js";
const original = {
  fetch: globalThis.fetch,
  document: globalThis.document,
  window: globalThis.window,
};
afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});
function browser(cookie = "csrf=" + "a".repeat(64)) {
  const events = [];
  globalThis.document = { cookie };
  globalThis.window = { dispatchEvent: (e) => events.push(e.type) };
  return events;
}
test("parallel API calls share CSRF initialization", async () => {
  browser("");
  let release,
    csrfRequests = 0,
    apiRequests = 0;
  const ready = new Promise((resolve) => (release = resolve));
  globalThis.fetch = async (path, options) => {
    if (path === "/api/auth/csrf") {
      csrfRequests++;
      await ready;
      document.cookie = "csrf=" + "a".repeat(64);
      return Response.json({ data: { csrf: "a".repeat(64) } });
    }
    apiRequests++;
    assert.ok(options.headers["x-csrf-token"] === "a".repeat(64));
    return Response.json({ data: [] });
  };
  const first = api("/customers"),
    second = api("/projects");
  assert.equal(csrfRequests, 1);
  release();
  await Promise.all([first, second]);
  assert.equal(apiRequests, 2);
});
test("proxy HTML errors produce a useful message and status without leaking HTML", async () => {
  browser();
  globalThis.fetch = async () =>
    new Response("<html>private proxy details</html>", { status: 502 });
  await assert.rejects(
    api("/customers"),
    (e) =>
      e instanceof ApiError &&
      e.status === 502 &&
      !e.message.includes("private proxy details") &&
      e.message.includes("Please try again"),
  );
});
test("failed CSRF initialization can be retried", async () => {
  browser("");
  globalThis.fetch = async () =>
    Response.json({ error: "Temporarily unavailable" }, { status: 503 });
  await assert.rejects(api("/customers"), (e) => e.status === 503);
  globalThis.fetch = async (path) => {
    if (path === "/api/auth/csrf") {
      document.cookie = "csrf=" + "a".repeat(64);
      return Response.json({ data: { csrf: "a".repeat(64) } });
    }
    return Response.json({ data: [] });
  };
  assert.deepEqual((await api("/customers")).data, []);
});
test("expired CSV downloads trigger the sign-in flow", async () => {
  const events = browser();
  globalThis.fetch = async () =>
    Response.json({ error: "Your session has expired." }, { status: 401 });
  await assert.rejects(downloadReport("projects"), (e) => e.status === 401);
  assert.deepEqual(events, ["session-expired"]);
});
test("calendar-only due dates stay on the same day in every timezone", () => {
  for (const zone of [
    "UTC",
    "Pacific/Kiritimati",
    "Pacific/Pago_Pago",
    "Asia/Kolkata",
  ])
    assert.equal(
      formatDate("2026-10-19", zone),
      formatDate("2026-10-19", "UTC"),
    );
  assert.equal(formatDate("invalid"), "—");
  assert.equal(
    calendarDate(new Date("2026-10-18T20:00:00Z"), "Asia/Kolkata"),
    "2026-10-19",
  );
});
