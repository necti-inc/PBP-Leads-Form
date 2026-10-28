"use client";

import { useMemo, useState } from "react";
import {
  WEEKDAY_LABELS,
  addMonths,
  buildMonthCells,
  formatFriendlyDate,
  formatMonthLabel,
  getBookingEndDate,
  getBookingStartDate,
  startOfMonth,
} from "@/lib/dates";

type VisitCalendarProps = {
  selectedDate: string;
  onSelect: (iso: string) => void;
  /** ISO dates blocked by Google Calendar (wired later). */
  blockedDates?: string[];
};

export function VisitCalendar({
  selectedDate,
  onSelect,
  blockedDates = [],
}: VisitCalendarProps) {
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const bookingStart = useMemo(() => getBookingStartDate(), []);
  const bookingEnd = useMemo(() => getBookingEndDate(), []);
  const minMonth = useMemo(() => startOfMonth(bookingStart), [bookingStart]);
  const maxMonth = useMemo(() => startOfMonth(bookingEnd), [bookingEnd]);

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(bookingStart));

  const cells = useMemo(
    () => buildMonthCells(viewMonth, blockedSet),
    [viewMonth, blockedSet]
  );

  const canPrev = viewMonth.getTime() > minMonth.getTime();
  const canNext = viewMonth.getTime() < maxMonth.getTime();

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#00adef]/25 bg-white shadow-[0_12px_32px_rgba(0,173,239,0.08)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#00adef]/15 bg-[#f3fbfe] px-3.5 py-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#00adef]/25 bg-white text-[#0089c2] transition hover:bg-[#e6f7fd] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!canPrev}
          aria-label="Previous month"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-[0.68rem] font-bold tracking-[0.14em] text-[#00adef] uppercase">
            Quote visit
          </p>
          <h4 className="text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
            {formatMonthLabel(viewMonth)}
          </h4>
        </div>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#00adef]/25 bg-white text-[#0089c2] transition hover:bg-[#e6f7fd] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!canNext}
          aria-label="Next month"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-2.5 pt-3 pb-1">
        {WEEKDAY_LABELS.map((label) => {
          const isService = label === "Mon" || label === "Tue" || label === "Wed";
          return (
            <div
              key={label}
              className={`py-1 text-center text-[0.68rem] font-bold tracking-[0.06em] uppercase ${
                isService ? "text-[#0089c2]" : "text-[var(--ink-muted)]/55"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-1 px-2.5 pb-3">
        {cells.map((cell) => {
          const selected = selectedDate === cell.iso;
          const muted = !cell.inMonth;

          if (!cell.selectable) {
            return (
              <div
                key={cell.iso}
                className={`grid aspect-square place-items-center rounded-xl text-sm font-semibold ${
                  muted
                    ? "text-[var(--ink-muted)]/25"
                    : "text-[var(--ink-muted)]/40"
                }`}
                aria-hidden={!cell.inMonth}
              >
                {cell.date.getDate()}
              </div>
            );
          }

          return (
            <button
              key={cell.iso}
              type="button"
              aria-label={formatFriendlyDate(cell.iso)}
              aria-pressed={selected}
              onClick={() => onSelect(cell.iso)}
              className={`relative grid aspect-square place-items-center rounded-xl text-sm font-bold transition ${
                selected
                  ? "bg-[#00adef] text-white shadow-[0_8px_18px_rgba(0,173,239,0.35)]"
                  : "bg-[#e6f7fd] text-[#0089c2] hover:bg-[#00adef] hover:text-white"
              }`}
            >
              {cell.date.getDate()}
              {cell.isToday && !selected && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#00adef]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#00adef]/15 bg-[#f7fcff] px-3.5 py-2.5 text-[0.72rem] font-semibold text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#e6f7fd] ring-1 ring-[#00adef]/35" />
          Available (Mon–Wed)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#00adef]" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-black/10" />
          Unavailable
        </span>
      </div>
    </div>
  );
}
