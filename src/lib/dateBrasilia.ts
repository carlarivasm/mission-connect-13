/**
 * Utility functions to work with dates in the America/Sao_Paulo timezone.
 * Replaces raw `new Date().toISOString().split("T")[0]` which returns UTC dates
 * and can be wrong for Brazilian users (UTC-3).
 */

const TZ = "America/Sao_Paulo";

/** Returns today's date as "YYYY-MM-DD" in Brasília timezone */
export function todayBrasilia(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  // "sv-SE" locale outputs ISO format: YYYY-MM-DD
}

/** Returns current time as "HH:MM" in Brasília timezone */
export function nowTimeBrasilia(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Returns a Date-like object parts for Brasília: { year, month (0-based), day, hours, minutes } */
export function nowBrasilia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";

  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")) - 1, // 0-based like JS Date
    day: parseInt(get("day")),
    hours: parseInt(get("hour")),
    minutes: parseInt(get("minute")),
    seconds: parseInt(get("second")),
  };
}

/** Returns a date string "YYYY-MM-DD" for a given Date object in Brasília timezone */
export function dateToBrasiliaString(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Returns "YYYY-MM-DD" for N days ago in Brasília timezone */
export function daysAgoBrasilia(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToBrasiliaString(d);
}
