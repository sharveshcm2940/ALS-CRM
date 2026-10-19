import { query } from "../config/index.js";
export async function companyTimezone() {
  const [row] = await query("SELECT timezone FROM settings WHERE id=1");
  return row?.timezone || "Asia/Kolkata";
}
export function dateInZone(date, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function midnightUtc(date, timezone) {
  const target = Date.parse(date + "T00:00:00Z");
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const wall = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    guess += target - wall;
  }
  return new Date(guess).toISOString().slice(0, 19).replace("T", " ");
}
