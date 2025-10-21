import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

export interface OcrItem {
  name: string;
  price: number;
  qty: number;
  participants?: string[];
  tempId?: string;
}

export interface OcrSummary {
  subtotal: number | null;
  serviceChargeAmount: number | null;
  serviceChargePercent: number | null;
  discount1Percent: number | null;
  discount2Percent: number | null;
  gstPercent: number | null;
  total: number | null;
  currency: string | null;
}

interface StructuredSummary {
  subtotal?: number | string | null;
  serviceChargeAmount?: number | string | null;
  serviceCharge?: number | string | null;
  serviceChargePercent?: number | string | null;
  discount1Percent?: number | string | null;
  discount2Percent?: number | string | null;
  gstPercent?: number | string | null;
  gst?: number | string | null;
  total?: number | string | null;
  currency?: string | null;
}

export interface OcrResult {
  items: OcrItem[];
  rawText: string;
  summary: OcrSummary;
}

interface ProcessOptions {
  origin: "upload" | "camera";
  summary?: StructuredSummary;
}

export interface OcrReaderHandle {
  open: () => void;
  triggerUpload: () => void;
  processDataUrl: (dataUrl: string, options?: ProcessOptions) => Promise<boolean>;
}

interface OcrReaderProps {
  onParse?: (result: OcrResult) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
  compact?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const SUPPORTED_CURRENCIES = ["MVR", "USD"];
const currencyCodes = new Set(SUPPORTED_CURRENCIES);
const currencyPattern = new RegExp(`\\b(${SUPPORTED_CURRENCIES.join("|")})\\b`, "i");

const EMPTY_SUMMARY: OcrSummary = {
  subtotal: null,
  serviceChargeAmount: null,
  serviceChargePercent: null,
  discount1Percent: null,
  discount2Percent: null,
  gstPercent: null,
  total: null,
  currency: null,
};

const fileToDataUrl = (file: File): Promise<string> => {
  if (!file || typeof file.size !== "number") {
    return Promise.reject(new Error("Unable to determine file size"));
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const limit = (MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0);
    return Promise.reject(new Error(`File size exceeds ${limit}MB limit`));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

const extractCurrencyFromLine = (line: string): string | null => {
  const codeMatch = line.match(/\b([A-Z]{2,4})\s*[-]?\s*\d/);
  if (codeMatch) {
    const candidate = codeMatch[1].toUpperCase();
    if (currencyCodes.has(candidate)) return candidate;
  }
  const knownMatch = line.match(currencyPattern);
  if (knownMatch) return knownMatch[1].toUpperCase();
  return null;
};

const parseOcrText = (text = ""): OcrItem[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const amountPattern = /(-?\d[\d,]*(?:[.,]\d{1,2})?)/;
  const skipWords = [
    "total",
    "subtotal",
    "gst",
    "tax",
    "discount",
    "balance",
    "tender",
    "payable",
    "service",
    "round",
    "thank",
    "thanks",
    "unsettled",
    "due",
    "card",
    "cash",
    "change",
    "bill amount",
    "grand",
  ];

  const items: OcrItem[] = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (skipWords.some((word) => lower.includes(word))) return;

    const match = line.match(amountPattern);
    if (!match) return;

    const rawAmount = match[1].replace(/\s/g, "");
    let normalizedAmount = rawAmount;
    if (rawAmount.includes(".") && rawAmount.includes(",")) {
      normalizedAmount = rawAmount.replace(/,/g, "");
    } else if (rawAmount.includes(",")) {
      normalizedAmount = rawAmount.replace(/,/g, ".");
    }
    const amount = Number.parseFloat(normalizedAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const priceIndex = line.indexOf(match[1]);
    if (priceIndex <= 0) return;

    let nameSegment = line.slice(0, priceIndex).trim();
    if (!nameSegment) return;

    let qty = 1;
    const qtyMatch = nameSegment.match(/(\d{1,3})\s*$/);
    if (qtyMatch) {
      const candidate = Number.parseInt(qtyMatch[1], 10);
      if (Number.isInteger(candidate) && candidate > 0 && candidate <= 20) {
        qty = candidate;
        nameSegment = nameSegment.slice(0, qtyMatch.index).trim();
      }
    }

    const cleanName = nameSegment.replace(/\s+/g, " ").replace(/[:;]/g, "").trim();
    if (!cleanName || cleanName.length < 2) return;

    items.push({ name: cleanName, price: Number(amount.toFixed(2)), qty });
  });

  return items;
};

const extractBillSummary = (text = ""): OcrSummary => {
  const summary: OcrSummary = { ...EMPTY_SUMMARY };

  if (!text) return summary;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parseAmount = (line: string): number | null => {
    const matches = line.match(/-?\d[\d,]*\.?\d+/g);
    if (!matches || !matches.length) return null;
    const match = matches[matches.length - 1];
    const normalized = match.replace(/[, ]/g, "");
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : null;
  };

  const parsePercent = (line: string): number | null => {
    const matches = line.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!matches) return null;
    const num = Number.parseFloat(matches[1]);
    return Number.isFinite(num) ? num : null;
  };

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (lower.includes("subtotal")) {
      summary.subtotal = parseAmount(line);
    } else if (lower.includes("service")) {
      summary.serviceChargeAmount = parseAmount(line);
      const percent = parsePercent(line);
      if (percent !== null) {
        summary.serviceChargePercent = percent;
      }
    } else if (lower.includes("discount") && lower.includes("1")) {
      const percent = parsePercent(line);
      if (percent !== null) {
        summary.discount1Percent = percent;
      }
    } else if (lower.includes("discount") && lower.includes("2")) {
      const percent = parsePercent(line);
      if (percent !== null) {
        summary.discount2Percent = percent;
      }
    } else if (lower.includes("gst") || lower.includes("tax")) {
      const percent = parsePercent(line);
      if (percent !== null) {
        summary.gstPercent = percent;
      }
    } else if (lower.includes("total")) {
      summary.total = parseAmount(line);
    }
    if (!summary.currency) {
      summary.currency = extractCurrencyFromLine(line);
    }
  });

  return summary;
};

const toNumber = (value: string | number | null | undefined): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/,/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const OcrReader = forwardRef<OcrReaderHandle, OcrReaderProps>(
  ({ onParse, onError, onStart, compact = false }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");
    const [stage, setStage] = useState("");
    const [progress, setProgress] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [controllerActive, setControllerActive] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Smoothly animate progress to a target value
    const animateProgressTo = (targetProgress: number, duration = 500) => {
      if (progressAnimationRef.current) {
        clearInterval(progressAnimationRef.current);
      }

      setProgress((currentProgress) => {
        if (currentProgress >= targetProgress) {
          return targetProgress;
        }

        const increment = (targetProgress - currentProgress) / (duration / 50);
        const intervalId = setInterval(() => {
          setProgress((prev) => {
            const next = prev + increment;
            if (next >= targetProgress) {
              clearInterval(intervalId);
              return targetProgress;
            }
            return next;
          });
        }, 50);

        progressAnimationRef.current = intervalId;
        return currentProgress;
      });
    };

    const startProcessing = (origin: ProcessOptions["origin"]) => {
      onStart?.();
      setIsProcessing(true);
      setHasError(false);
      setStage(origin === "camera" ? "Processing capture" : "Uploading receipt");
      setProgress(0);
      setStatus("Analyzing receipt…");
      // Smoothly animate to 10% at start
      animateProgressTo(0.1, 300);
    };

    const processDataUrl = async (dataUrl: string, options: ProcessOptions): Promise<boolean> => {
      if (!dataUrl || typeof dataUrl !== "string") {
        onError?.("Unable to process image. Try again.");
        return false;
      }
      if (isProcessing) return false;

      startProcessing(options.origin);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setControllerActive(true);

      let hadError = false;

      try {
        // Animate to 30% while preparing request
        animateProgressTo(0.3, 500);
        const payload = JSON.stringify({
          image: dataUrl,
        });

        const endpoint = import.meta.env.VITE_OCR_ENDPOINT || "/.netlify/functions/scan-receipt";

        // Start fetching and animate progress to 60% during the request
        const fetchPromise = fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          signal: controller.signal,
        });

        // Simulate progress animation while waiting for response
        animateProgressTo(0.6, 2000);
        const res = await fetchPromise;

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to scan receipt.");
        }

        // Animate to 80% while parsing response
        animateProgressTo(0.8, 400);
        const raw = (await res.json()) as {
          items?: Array<{ name?: string; price?: number; qty?: number; participants?: string[] }>;
          rawText?: string;
          summary?: StructuredSummary;
        };
        const { items = [], rawText = "", summary: structuredSummary = {} } = raw ?? {};
        const parsedItems = Array.isArray(items)
          ? items
              .map((item, index) => ({
                name: String(item.name ?? "").trim(),
                price: Number(item.price ?? 0),
                qty: Number(item.qty ?? 1),
                participants: Array.isArray(item.participants) ? item.participants : [],
                tempId: `ocr-${Date.now()}-${index}`,
              }))
              .filter((item) => item.name && Number.isFinite(item.price) && Number.isFinite(item.qty))
          : [];

        const textSummary = extractBillSummary(rawText);
        const mergedSummary: OcrSummary = {
          subtotal: toNumber(structuredSummary.subtotal) ?? textSummary.subtotal,
          serviceChargeAmount:
            toNumber(structuredSummary.serviceChargeAmount) ??
            toNumber(structuredSummary.serviceCharge) ??
            textSummary.serviceChargeAmount,
          serviceChargePercent: toNumber(structuredSummary.serviceChargePercent) ?? textSummary.serviceChargePercent,
          discount1Percent: toNumber(structuredSummary.discount1Percent) ?? textSummary.discount1Percent,
          discount2Percent: toNumber(structuredSummary.discount2Percent) ?? textSummary.discount2Percent,
          gstPercent: toNumber(structuredSummary.gstPercent) ?? toNumber(structuredSummary.gst) ?? textSummary.gstPercent,
          total: toNumber(structuredSummary.total) ?? textSummary.total,
          currency: structuredSummary.currency || textSummary.currency,
        };

        onParse?.({ items: parsedItems, rawText, summary: mergedSummary });

        // Animate to 100% to show completion
        animateProgressTo(1, 400);
        setStage("Scan complete");
        return true;
      } catch (err) {
        hadError = true;

        if ((err as Error).name === "AbortError") {
          onError?.("Upload cancelled.");
          // Reset state immediately for cancelled requests
          setStatus("");
          setStage("");
          setProgress(0);
          setHasError(false);
          return false;
        }
        console.error("OCR scan failed", err);

        // Clear any ongoing progress animation on error
        if (progressAnimationRef.current) {
          clearInterval(progressAnimationRef.current);
          progressAnimationRef.current = null;
        }

        setHasError(true);
        setStatus("Failed");
        setStage("Scan failed");
        setProgress(1); // Show full bar in red to indicate completion with error
        onError?.("Failed to scan receipt. Please try again with a clearer image.");

        // Keep error state visible for longer before resetting
        resetTimeoutRef.current = setTimeout(() => {
          setStatus("");
          setStage("");
          setProgress(0);
          setHasError(false);
        }, 3000);

        return false;
      } finally {
        setIsProcessing(false);
        if (inputRef.current) inputRef.current.value = "";
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setControllerActive(false);

        // Only reset for successful scans, not errors (errors handle their own reset)
        if (!hadError) {
          // Clear any ongoing progress animation
          if (progressAnimationRef.current) {
            clearInterval(progressAnimationRef.current);
            progressAnimationRef.current = null;
          }

          // Reset all progress state after a brief delay to allow modal transition
          resetTimeoutRef.current = setTimeout(() => {
            setStatus("");
            setStage("");
            setProgress(0);
            setHasError(false);
          }, 500);
        }
      }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        await processDataUrl(dataUrl, { origin: "upload" });
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    };

    useImperativeHandle(ref, () => ({
      open() {
        if (isProcessing) return;
        if (inputRef.current) {
          inputRef.current.value = "";
          inputRef.current.click();
        }
      },
      triggerUpload() {
        if (isProcessing) return;
        if (inputRef.current) {
          inputRef.current.value = "";
          inputRef.current.click();
        }
      },
      async processDataUrl(dataUrl, options) {
        return processDataUrl(dataUrl, { origin: "camera", ...options });
      },
    }));

    const rawProgress = useMemo(() => Math.min(Math.max(progress, 0), 1), [progress]);
    const percentage = Math.round(rawProgress * 100);
    const barWidth = rawProgress > 0 || isProcessing ? Math.min(100, Math.max(12, percentage)) : 0;
    const showProgress = isProcessing || rawProgress > 0;
    const stageLabel = stage || status || "Working…";

    useEffect(
      () => () => {
        abortControllerRef.current?.abort();
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        if (progressAnimationRef.current) {
          clearInterval(progressAnimationRef.current);
        }
      },
      [],
    );

    return (
      <div className={compact ? "mt-2 space-y-2 text-xs text-slate-400" : "my-4 space-y-3"}>
        <input
          ref={inputRef}
          id="ocr-upload"
          name="ocr-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {showProgress ? (
          <div className={`relative overflow-hidden rounded-3xl border p-4 ${
            hasError
              ? "border-red-400/40 bg-red-500/10 shadow-[0_22px_60px_rgba(239,68,68,0.18)]"
              : "border-emerald-400/40 bg-emerald-500/10 shadow-[0_22px_60px_rgba(16,185,129,0.18)]"
          }`}>
            <div className={`pointer-events-none absolute -inset-2 rounded-[32px] opacity-50 blur-3xl ${
              hasError
                ? "bg-gradient-to-r from-red-400/30 via-rose-300/20 to-orange-400/25"
                : "bg-gradient-to-r from-emerald-400/30 via-teal-300/20 to-sky-400/25"
            }`} />
            <div className="relative space-y-3">
              <div className={`flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.32em] ${
                hasError ? "text-red-100/80" : "text-emerald-100/80"
              }`}>
                <span>{hasError ? "Failed" : "Analyzing"}</span>
                <span className={`text-xs ${hasError ? "text-red-50" : "text-emerald-50"}`}>{`${percentage}%`}</span>
              </div>
              <div className={`relative h-2 overflow-hidden rounded-full ${
                hasError ? "bg-red-400/15" : "bg-emerald-400/15"
              }`}>
                <div
                  className={`h-full rounded-full ${
                    hasError
                      ? "bg-gradient-to-r from-red-400 via-rose-400 to-orange-400"
                      : "bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-400"
                  } ${barWidth > 0 && !hasError ? "animate-shimmer-scan" : ""}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className={`flex items-center gap-3 text-[11px] font-medium ${
                hasError ? "text-red-100" : "text-emerald-100"
              }`}>
                {!hasError && (
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <span className={`absolute h-full w-full rounded-full border ${
                      hasError ? "border-red-200/40" : "border-emerald-200/40"
                    }`} />
                    <span className={`absolute h-full w-full rounded-full border-2 border-t-transparent animate-spin ${
                      hasError ? "border-red-200/90" : "border-emerald-200/90"
                    }`} />
                  </span>
                )}
                {hasError && (
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
                <span className={`flex-1 ${hasError ? "text-red-50/90" : "text-emerald-50/90"}`}>{stageLabel}</span>
              </div>
              {controllerActive && (
                <button
                  type="button"
                  onClick={() => abortControllerRef.current?.abort()}
                  className={`text-xs font-semibold underline decoration-dotted underline-offset-2 ${
                    hasError ? "text-red-100" : "text-emerald-100"
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : status ? (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
            {status}
          </div>
        ) : null}
      </div>
    );
  },
);

export default OcrReader;
