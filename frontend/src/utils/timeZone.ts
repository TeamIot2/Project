export const DEFAULT_TIME_ZONE = "Europe/Prague";

export type TimeZoneOption = {
  value: string;
  label: string;
};

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Europe/Prague",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Warsaw",
  "Europe/Kyiv",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
}

export function isValidTimeZone(timeZone: string | undefined | null): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(timeZone: string | undefined | null): string {
  if (isValidTimeZone(timeZone)) return timeZone;
  const browserTimeZone = getBrowserTimeZone();
  return isValidTimeZone(browserTimeZone) ? browserTimeZone : DEFAULT_TIME_ZONE;
}

export function getSupportedTimeZones(currentTimeZone?: string): string[] {
  const supported = (Intl as IntlWithSupportedValues).supportedValuesOf?.("timeZone") ?? FALLBACK_TIME_ZONES;
  const zones = new Set([...supported, ...FALLBACK_TIME_ZONES, normalizeTimeZone(currentTimeZone)]);
  return Array.from(zones).filter(isValidTimeZone).sort((a, b) => a.localeCompare(b));
}

function localeCode(locale: string): string {
  return locale === "cs" ? "cs-CZ" : "en-US";
}

function formatTimeZoneOffset(timeZone: string, date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const timeZoneName = formatter
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "";
    if (timeZoneName === "GMT") return "UTC+00:00";
    return timeZoneName.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

export function getTimeZoneOptions(locale: string, currentTimeZone?: string): TimeZoneOption[] {
  return getSupportedTimeZones(currentTimeZone).map((timeZone) => {
    const offset = formatTimeZoneOffset(timeZone);
    const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
    return {
      value: timeZone,
      label: offset ? `${offset} - ${timeZone} (${city})` : timeZone,
    };
  }).sort((a, b) => a.label.localeCompare(b.label, localeCode(locale)));
}

function getPartsInTimeZone(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getPartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

export function formatDateForInputInTimeZone(date: Date, timeZone: string): string {
  const parts = getPartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTimeForInputInTimeZone(date: Date, timeZone: string): string {
  const parts = getPartsInTimeZone(date, timeZone);
  return `${parts.hour}:${parts.minute}`;
}

export function zonedDateTimeToUtcIso(dateValue: string, timeValue: string, timeZone: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const zone = normalizeTimeZone(timeZone);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i += 1) {
    utcMs = Date.UTC(year, month - 1, day, hour, minute) - getTimeZoneOffsetMs(new Date(utcMs), zone);
  }

  return Number.isFinite(utcMs) ? new Date(utcMs).toISOString() : null;
}

export function formatClockInTimeZone(date: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(localeCode(locale), {
    timeZone: normalizeTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatChartTimeInTimeZone(timeMs: number, hours: number, timeZone: string, locale: string): string {
  const date = new Date(timeMs);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(localeCode(locale), {
    timeZone: normalizeTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    ...(hours > 24 ? { month: "short", day: "numeric" } : {}),
    hour12: false,
  }).format(date);
}
