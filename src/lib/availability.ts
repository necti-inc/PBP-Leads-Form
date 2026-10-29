import { config } from "./config";
import {
  DEFAULT_SERVICE_WEEKDAYS,
  getBookingEndDate,
  getBookingStartDate,
  normalizeWorkdays,
  toISODate,
} from "./dates";

export type AvailabilityResponse = {
  ok: boolean;
  configured?: boolean;
  maxPerDay?: number;
  fullDates?: string[];
  workdays?: number[];
  counts?: Record<string, number>;
  error?: string;
};

export async function fetchBlockedDates(): Promise<{
  fullDates: string[];
  maxPerDay: number;
  configured: boolean;
  workdays: number[];
}> {
  const from = toISODate(getBookingStartDate());
  const to = toISODate(getBookingEndDate());
  const url = `${config.intakeUrl.replace(/\/$/, "")}/availability?from=${from}&to=${to}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json().catch(() => ({}))) as AvailabilityResponse;
    return {
      fullDates: Array.isArray(data.fullDates) ? data.fullDates : [],
      maxPerDay: data.maxPerDay || 20,
      configured: Boolean(data.configured),
      workdays: normalizeWorkdays(data.workdays),
    };
  } catch {
    return {
      fullDates: [],
      maxPerDay: 20,
      configured: false,
      workdays: [...DEFAULT_SERVICE_WEEKDAYS],
    };
  }
}
