let csrfRequest;
const readCsrf = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("csrf="))
    ?.slice(5) || "";
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      response.ok
        ? "The server returned an unexpected response. Please try again."
        : "The server could not complete the request. Please try again.",
      response.status,
    );
  }
}
export async function initializeCsrf() {
  if (readCsrf()) return;
  if (!csrfRequest)
    csrfRequest = (async () => {
      const response = await fetch("/api/auth/csrf", {
        credentials: "include",
      });
      const result = await readJson(response);
      if (!response.ok || !result.data?.csrf)
        throw new ApiError(
          result.error ||
            "Could not initialize the secure session. Please retry.",
          response.status,
        );
    })().finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}
function expired(response, path) {
  if (response.status === 401 && path !== "/auth/login")
    window.dispatchEvent(new Event("session-expired"));
}
export async function api(path, options = {}) {
  await initializeCsrf();
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": readCsrf(),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  expired(response, path);
  const result = await readJson(response);
  if (!response.ok)
    throw new ApiError(
      (result.error || "The request failed.") +
        (result.details
          ? " " +
            result.details.map((d) => `${d.field}: ${d.message}`).join(" ")
          : ""),
      response.status,
    );
  return result;
}
export async function downloadReport(report) {
  const path = `/reports/${report}?format=csv`;
  const response = await fetch("/api" + path, { credentials: "include" });
  expired(response, path);
  if (!response.ok) {
    const result = await readJson(response);
    throw new ApiError(result.error || "Export failed.", response.status);
  }
  const blob = await response.blob();
  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    document.createElement
  ) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `als-${report}.csv`;
    if (document.body) document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body && a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}
