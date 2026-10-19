let csrf = "";
export async function initializeCsrf() {
  const r = await fetch("/api/auth/csrf", { credentials: "include" });
  const j = await r.json();
  csrf = j.data.csrf;
}
export async function api(path, options = {}) {
  if (!csrf) await initializeCsrf();
  csrf =
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf="))
      ?.slice(5) || csrf;
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const result = await response.json();
  if (result.data?.csrf) csrf = result.data.csrf;
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(
      result.error +
        (result.details
          ? " " +
            result.details.map((d) => `${d.field}: ${d.message}`).join(" ")
          : ""),
    );
  }
  return result;
}
export async function downloadReport(report) {
  if (!csrf) await initializeCsrf();
  csrf =
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf="))
      ?.slice(5) || csrf;
  const response = await fetch(`/api/reports/${report}?format=csv`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error((await response.json()).error);
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `als-${report}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
