export function parseTimestamp(value) {
  if (value instanceof Date) return value;
  if (!value || typeof value !== "string") return new Date(NaN);
  if (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  return new Date(value.replace(" ", "T") + "Z");
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
