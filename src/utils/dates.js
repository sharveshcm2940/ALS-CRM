export function parseTimestamp(value) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
}
export function calendarDate(value, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
export function formatDate(value, timezone = "Asia/Kolkata", time = false) {
  if (!value) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? new Date(value + "T00:00:00Z")
    : parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: dateOnly ? "UTC" : timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(!dateOnly && time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
