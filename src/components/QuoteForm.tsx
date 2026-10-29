"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AddressAutocomplete,
  isAddressSelectionRequired,
} from "@/components/AddressAutocomplete";
import { VisitCalendar } from "@/components/VisitCalendar";
import { fetchBlockedDates } from "@/lib/availability";
import { config } from "@/lib/config";
import {
  DEFAULT_SERVICE_WEEKDAYS,
  WEEKDAY_LABELS,
  formatFriendlyDate,
  isDateSelectable,
} from "@/lib/dates";
import {
  formatPhoneInput,
  normalizePhoneDigits,
  validateContactFields,
} from "@/lib/validation";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  poolSize: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  poolSize: "",
};

function buildTrackingPayload() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("source") || "facebook",
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    fbclid: params.get("fbclid"),
  };
}

async function postIntake(payload: Record<string, unknown>) {
  const res = await fetch(config.intakeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.intakeKey ? { "x-intake-key": config.intakeKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not submit your request.");
  }
  return data as { leadId?: string; ok?: boolean };
}

export function QuoteForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [addressVerified, setAddressVerified] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ leadId?: string; date: string | null } | null>(
    null
  );
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [workdays, setWorkdays] = useState<number[]>(DEFAULT_SERVICE_WEEKDAYS);
  const [maxPerDay, setMaxPerDay] = useState(20);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (!calendarOpen) return;
    let cancelled = false;
    setAvailabilityLoading(true);
    void fetchBlockedDates().then((result) => {
      if (cancelled) return;
      setBlockedDates(result.fullDates);
      setWorkdays(result.workdays);
      setMaxPerDay(result.maxPerDay);
      setAvailabilityLoading(false);
      if (
        selectedDate &&
        (result.fullDates.includes(selectedDate) ||
          !isDateSelectable(
            new Date(
              Number(selectedDate.slice(0, 4)),
              Number(selectedDate.slice(5, 7)) - 1,
              Number(selectedDate.slice(8, 10)),
              12
            ),
            new Set(result.fullDates),
            result.workdays
          ))
      ) {
        setSelectedDate("");
      }
    });
    return () => {
      cancelled = true;
    };
    // Refresh when the picker opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarOpen]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm() {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      return "Please fill in your name, email, phone, and address.";
    }

    const contactError = validateContactFields(form.email, form.phone);
    if (contactError) return contactError;

    if (isAddressSelectionRequired() && !addressVerified) {
      return "Select your service address from the Google suggestions.";
    }

    return "";
  }

  function contactPayload() {
    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      fullname: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      email: form.email.trim(),
      phonenumber: normalizePhoneDigits(form.phone),
      homeaddress: form.address.trim(),
      poolSize: form.poolSize.trim() || null,
      projectType: "Free Pool Cleaning Quote",
      ...buildTrackingPayload(),
    };
  }

  async function openCalendar(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // Capture the lead as soon as they submit contact info (status: new).
      if (!leadId) {
        const data = await postIntake({
          ...contactPayload(),
          preferredDate: null,
        });
        if (!data.leadId) {
          throw new Error("Could not save your request.");
        }
        setLeadId(data.leadId);
      }
      setCalendarOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmVisit() {
    if (!selectedDate) {
      setError("Pick a visit date to continue.");
      return;
    }
    if (!leadId) {
      setError("Please submit your info again.");
      return;
    }

    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!isDateSelectable(new Date(y, m - 1, d, 12), new Set(blockedDates), workdays)) {
      const openLabel = workdays.map((day) => WEEKDAY_LABELS[day]).join(", ");
      setError(`Please choose an available day (${openLabel}).`);
      return;
    }

    setScheduling(true);
    setError("");

    try {
      await postIntake({
        leadId,
        preferredDate: selectedDate,
      });
      setDone({ leadId, date: selectedDate });
      setCalendarOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScheduling(false);
    }
  }

  function finishWithoutScheduling() {
    setCalendarOpen(false);
    setDone({ leadId: leadId || undefined, date: null });
  }

  if (done) {
    return (
      <div className="relative rounded-[24px] border border-[var(--line)] bg-white p-7 shadow-[0_24px_60px_rgba(6,90,120,0.1)] sm:p-9">
        <button
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-lg font-semibold text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand-deep)]"
          onClick={() => {
            setDone(null);
            setForm(emptyForm);
            setAddressVerified(false);
            setSelectedDate("");
            setLeadId(null);
            setError("");
          }}
        >
          ×
        </button>
        <p className="pr-10 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
          {done.date ? "You’re booked" : "Request received"}
        </p>
        <h2 className="mt-3 text-[1.85rem] font-extrabold tracking-[-0.03em] text-[var(--ink)]">
          Thanks, {form.firstName}!
        </h2>
        <p className="mt-3 text-[var(--ink-muted)]">
          {done.date ? (
            <>
              We saved your free quote request for{" "}
              <strong className="text-[var(--ink)]">
                {formatFriendlyDate(done.date)}
              </strong>
              . The Pools by Pros team will follow up to confirm the visit — no need to
              call.
            </>
          ) : (
            <>
              We saved your info and will reach out soon to schedule your free quote
              visit. No need to call.
            </>
          )}
        </p>
        <div className="btn btn-primary mt-7 pointer-events-none cursor-default">
          You’re all set
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={openCalendar}
        className="relative overflow-visible rounded-[24px] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(6,90,120,0.1)] sm:p-8"
      >
        <div className="relative grid gap-4 overflow-visible sm:grid-cols-2">
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              required
              autoComplete="given-name"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              required
              autoComplete="family-name"
              placeholder="Smith"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="johnsmith@gmail.com"
              pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+"
              title="Enter a valid email address"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="(951) 442-0992"
              pattern="\(\d{3}\) \d{3}-\d{4}"
              title="Enter a 10-digit US phone number"
              maxLength={14}
              value={form.phone}
              onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
            />
          </div>
          <AddressAutocomplete
            value={form.address}
            onChange={(address) => update("address", address)}
            onVerifiedChange={setAddressVerified}
          />
          <div className="field sm:col-span-2">
            <label htmlFor="poolSize">
              Pool size <span className="font-medium text-[var(--ink-muted)]">(optional)</span>
            </label>
            <input
              id="poolSize"
              placeholder="e.g. 15,000 gal or medium"
              value={form.poolSize}
              onChange={(e) => update("poolSize", e.target.value)}
            />
          </div>
        </div>

        {error && !calendarOpen && (
          <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>
        )}

        <button type="submit" className="btn btn-primary mt-6" disabled={submitting}>
          {submitting ? "Saving…" : "Schedule Free Quote"}
        </button>
        <p className="mt-3 text-center text-sm text-[var(--ink-muted)]">
          We’ll save your info, then you can pick a day.
        </p>
      </form>

      {calendarOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--calendar">
            <div className="modal-card__header">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
                  Choose a day
                </p>
                <h3 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                  When should we come out?
                </h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  Available {workdays.map((day) => WEEKDAY_LABELS[day]).join(", ")}
                  {maxPerDay ? ` · up to ${maxPerDay} visits/day` : ""}.
                </p>
              </div>
              <button
                type="button"
                className="modal-card__close"
                aria-label="Close"
                onClick={finishWithoutScheduling}
              >
                ×
              </button>
            </div>

            <div className="modal-card__body">
              {availabilityLoading && (
                <p className="mb-3 text-sm font-semibold text-[var(--ink-muted)]">
                  Checking calendar availability…
                </p>
              )}

              <VisitCalendar
                selectedDate={selectedDate}
                blockedDates={blockedDates}
                workdays={workdays}
                onSelect={(iso) => {
                  setSelectedDate(iso);
                  setError("");
                }}
              />

              {selectedDate && (
                <p className="mt-3 text-center text-sm font-semibold text-[var(--ink)]">
                  Selected:{" "}
                  <span className="text-[var(--brand-deep)]">
                    {formatFriendlyDate(selectedDate)}
                  </span>
                </p>
              )}

              {error && (
                <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
              )}
            </div>

            <div className="modal-card__footer">
              <button
                type="button"
                className="btn btn-primary"
                disabled={scheduling || !selectedDate}
                onClick={confirmVisit}
              >
                {scheduling ? "Saving…" : "Confirm Visit"}
              </button>
              <button
                type="button"
                className="btn btn-ghost mt-2 w-full"
                disabled={scheduling}
                onClick={finishWithoutScheduling}
              >
                Skip for now — we’ll call you
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
