import { config } from "./config";
import { getBookingEndDate, getBookingStartDate, toISODate } from "./dates";

export type AvailabilityResponse = {
  ok: boolean;
  configured?: boolean;
  maxPerDay?: number;
  fullDates?: string[];
  counts?: Record<string, number>;
  error?: string;
};

export async function fetchBlockedDates(): Promise<{
  fullDates: string[];
  maxPerDay: number;
  configured: boolean;
}> {
  const from = toISODate(getBookingStartDate());
  const to = toISODate(getBookingEndDate());
  const url = `${config.intakeUrl.replace(/\/$/, "")}/availability?from=${from}&to=${to}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json().catch(() => ({}))) as AvailabilityResponse;
    return {
      fullDates: Array.isArray(data.fullDates) ? data.fullDates : [],
      maxPerDay: data.maxPerDay || 3,
      configured: Boolean(data.configured),
    };
  } catch {
    return { fullDates: [], maxPerDay: 3, configured: false };
  }
}
