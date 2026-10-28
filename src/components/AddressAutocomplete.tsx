"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import {
  type AddressPrediction,
  ensureGoogleMapsLoaded,
  fetchAddressPredictions,
  fetchPlaceDetails,
  isGoogleMapsConfigured,
  parseAddressFromPlace,
  validateParsedAddress,
} from "@/lib/googleMaps";

type AddressAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onVerifiedChange?: (verified: boolean) => void;
  required?: boolean;
};

export function AddressAutocomplete({
  id = "address",
  value,
  onChange,
  onVerifiedChange,
  required = true,
}: AddressAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const selectingRef = useRef(false);
  const fromListRef = useRef(false);
  const requestIdRef = useRef(0);
  const onVerifiedChangeRef = useRef(onVerifiedChange);

  const [verified, setVerified] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    onVerifiedChangeRef.current = onVerifiedChange;
  }, [onVerifiedChange]);

  function setVerifiedState(next: boolean) {
    setVerified(next);
    fromListRef.current = next;
    onVerifiedChangeRef.current?.(next);
  }

  useEffect(() => {
    let cancelled = false;

    if (!isGoogleMapsConfigured()) {
      setMapsLoadError("");
      return;
    }

    ensureGoogleMapsLoaded()
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
          setMapsLoadError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapsLoadError(
            "Address suggestions are unavailable right now. You can still type your address."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) return;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  function clearDebounce() {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function search(query: string) {
    clearDebounce();
    if (!mapsReady || !query.trim()) {
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;

    debounceRef.current = window.setTimeout(() => {
      void fetchAddressPredictions(query).then((results) => {
        if (requestId !== requestIdRef.current) return;
        setPredictions(results);
        setOpen(results.length > 0);
        setActiveIndex(results.length ? 0 : -1);
        setLoading(false);
      });
    }, 180);
  }

  async function selectPrediction(prediction: AddressPrediction) {
    selectingRef.current = true;
    setOpen(false);
    setPredictions([]);
    setActiveIndex(-1);
    setLoading(true);

    try {
      const place = await fetchPlaceDetails(prediction.placeId);
      if (!place?.address_components?.length) {
        setVerifiedState(false);
        setFieldError("Couldn’t confirm that address. Try another suggestion.");
        return;
      }

      const parsed = parseAddressFromPlace(place);
      const validationError = validateParsedAddress(parsed);
      if (validationError) {
        setVerifiedState(false);
        setFieldError(validationError);
        return;
      }

      onChange(parsed.fullAddress);
      setVerifiedState(true);
      setFieldError("");
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        selectingRef.current = false;
      }, 0);
      inputRef.current?.focus();
    }
  }

  function onInputChange(next: string) {
    if (selectingRef.current) return;
    onChange(next);
    setVerifiedState(false);
    setFieldError("");
    search(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !predictions.length) {
      if (event.key === "ArrowDown" && value.trim()) {
        search(value);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % predictions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? predictions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectPrediction(predictions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="field relative z-20 sm:col-span-2" ref={rootRef}>
      <label htmlFor={id}>Service address</label>
      <div
        className={`relative ${
          verified ? "address-input-wrap--verified" : ""
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          required={required}
          autoComplete="off"
          placeholder="Start typing your street address…"
          value={value}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            if (predictions.length) setOpen(true);
            else if (value.trim() && !verified) search(value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              if (selectingRef.current) return;
              if (
                isGoogleMapsConfigured() &&
                value.trim() &&
                !fromListRef.current
              ) {
                setFieldError("Select your address from the suggestions.");
              }
            }, 120);
          }}
          className="!pr-10"
        />
        {verified && (
          <span
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-bold text-[#16a34a]"
            aria-hidden
          >
            ✓
          </span>
        )}

        {open && predictions.length > 0 && (
          <div
            id={listId}
            role="listbox"
            className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 overflow-hidden rounded-2xl border-2 border-[#00adef]/40 bg-white shadow-[0_20px_50px_rgba(10,22,32,0.18)]"
          >
            <ul className="m-0 max-h-[280px] list-none overflow-auto p-0">
              {predictions.map((prediction, index) => {
                const active = index === activeIndex;
                return (
                  <li key={prediction.placeId} className="m-0 p-0">
                    <button
                      id={`${listId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex w-full items-start gap-3 border-0 border-b border-black/10 px-3.5 py-3 text-left transition-colors ${
                        active ? "bg-[#e6f7fd]" : "bg-white hover:bg-[#f0faff]"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void selectPrediction(prediction)}
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          active
                            ? "bg-[#00adef] text-white"
                            : "bg-[#e6f7fd] text-[#0089c2]"
                        }`}
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                          <path
                            d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <circle cx="12" cy="10" r="2.4" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="block text-[0.95rem] leading-snug font-bold tracking-[-0.01em] text-[var(--ink)]">
                          {prediction.primary}
                        </span>
                        {prediction.secondary ? (
                          <span className="block text-[0.8rem] leading-snug font-medium text-[var(--ink-muted)]">
                            {prediction.secondary}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[#00adef]/20 bg-[#e6f7fd] px-3.5 py-2.5 text-[0.68rem] font-bold tracking-[0.1em] text-[#0089c2] uppercase">
              Pools by Pros · service area
            </div>
          </div>
        )}
      </div>

      {fieldError && <p className="address-hint address-hint--error">{fieldError}</p>}
      {!fieldError && mapsLoadError && (
        <p className="address-hint address-hint--error">{mapsLoadError}</p>
      )}
      {!fieldError && !mapsLoadError && verified && (
        <p className="address-hint address-hint--ok">Address confirmed</p>
      )}
      {!fieldError && !mapsLoadError && loading && !verified && (
        <p className="address-hint">Searching addresses…</p>
      )}
      {!fieldError &&
        !mapsLoadError &&
        !loading &&
        !verified &&
        isGoogleMapsConfigured() && (
          <p className="address-hint">
            Pick your address from the suggestions so we get it right.
          </p>
        )}
    </div>
  );
}

export function isAddressSelectionRequired(): boolean {
  return isGoogleMapsConfigured();
}
