import React, { useImperativeHandle, useMemo, useRef, useState } from "react";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const parseOcrText = (text = "") => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const amountPattern = /(-?\d[\d,]*[\.]\d{2})/;
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

  const items = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (skipWords.some((word) => lower.includes(word))) return;

    const match = line.match(amountPattern);
    if (!match) return;

    const amount = Number.parseFloat(match[1].replace(/,/g, ""));
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

const extractBillSummary = (text = "") => {
  const summary = {
    subtotal: null,
    serviceChargeAmount: null,
    total: null,
    currency: null,
  };

  if (!text) return summary;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parseAmount = (line) => {
    const matches = line.match(/-?\d[\d,]*\.?\d+/g);
    if (!matches || !matches.length) return null;
    const match = matches[matches.length - 1];
    const endIndex = line.lastIndexOf(match) + match.length;
    const trailing = line.slice(endIndex).trim();
    if (trailing.startsWith("%")) return null;
    const candidate = match.replace(/,/g, "");
    const value = Number.parseFloat(candidate);
    return Number.isFinite(value) ? value : null;
  };

  const extractCurrency = (line) => {
    const codeMatch = line.match(/\b([A-Z]{2,4})\s*[-]?\s*\d/);
    if (codeMatch) return codeMatch[1].toUpperCase();
    const knownMatch = line.match(/\b(MVR|USD|EUR|GBP|INR|SGD|AUD|CAD|JPY|MYR|CNY|CHF|AED|SAR)\b/i);
    if (knownMatch) return knownMatch[1].toUpperCase();
    return null;
  };

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (!summary.currency) {
      const currency = extractCurrency(line);
      if (currency) summary.currency = currency;
    }

    if (summary.subtotal === null && (lower.includes('subtotal') || lower.includes('sub total'))) {
      const amount = parseAmount(line);
      if (amount !== null) summary.subtotal = amount;
      return;
    }

    if (
      summary.serviceChargeAmount === null &&
      (lower.includes('service charge') || lower.includes('svc charge') || lower.includes('service fee'))
    ) {
      const amount = parseAmount(line);
      if (amount !== null) summary.serviceChargeAmount = amount;
      return;
    }

    const mentionsTotal = lower.includes('total') || lower.includes('amount due') || lower.includes('grand total') || lower.includes('balance due');
    const isSubtotal = lower.includes('subtotal');
    const isServiceOrTax = lower.includes('service') || lower.includes('tax');

    if (summary.total === null && mentionsTotal && !isSubtotal && !isServiceOrTax) {
      const amount = parseAmount(line);
      if (amount !== null) summary.total = amount;
    }
  });

  return summary;
};

const DEFAULT_ENDPOINT = "/.netlify/functions/scan-receipt";

const OcrReader = React.forwardRef(({ onParse, onError, onStart, compact = false }, ref) => {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const endpoint = useMemo(() => {
    const explicit = import.meta.env.VITE_OCR_ENDPOINT?.trim();
    if (explicit) return explicit;
    return import.meta.env.PROD ? DEFAULT_ENDPOINT : null;
  }, []);

  useImperativeHandle(ref, () => ({
    open() {
      if (isProcessing) return;
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.click();
      }
    },
  }));

  const runRemoteOcr = async (dataUrl) => {
    if (!endpoint) return null;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!response.ok) throw new Error(`OCR request failed (${response.status})`);
    const payload = await response.json();

    // New API returns items directly
    if (payload.items && Array.isArray(payload.items)) {
      return {
        items: payload.items,
        summary: payload.summary || {},
        rawText: payload.rawText || "",
        provider: payload.provider,
      };
    }

    // Legacy fallback: text-based parsing
    return { items: null, rawText: payload.text || "", provider: "legacy" };
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onStart?.();
    setIsProcessing(true);

    if (!endpoint) {
      setStatus("OCR unavailable");
      onError?.("Receipt scanning requires the Gemini OCR endpoint. Configure VITE_OCR_ENDPOINT for local testing.");
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      setStatus("Uploading");
      const dataUrl = await fileToDataUrl(file);

      let items = [];
      let rawText = "";
      let result = null;

      setStatus("Scanning with Gemini");
      result = await runRemoteOcr(dataUrl);

      if (result && result.items && result.items.length > 0) {
        items = result.items;
        rawText = result.rawText;
        setStatus(() => `Done (${result.provider || "gemini"})`);
      } else if (result && result.rawText) {
        // Parse text-based response
        setStatus("Parsing");
        items = parseOcrText(result.rawText);
        rawText = result.rawText;
        setStatus(() => `Done (${result.provider || "legacy"})`);
      } else {
        throw new Error("No OCR response from Gemini");
      }

      if (!items.length) {
        throw new Error("No items detected");
      }

      const structuredSummary = result?.summary && typeof result.summary === "object" ? result.summary : {};
      const toNumber = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value === "string") {
          const parsed = Number(value.replace(/,/g, ""));
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };
      const textSummary = extractBillSummary(rawText);
      const mergedSummary = {
        subtotal: toNumber(structuredSummary.subtotal) ?? textSummary.subtotal,
        serviceChargeAmount:
          toNumber(structuredSummary.serviceChargeAmount) ??
          toNumber(structuredSummary.serviceCharge) ??
          textSummary.serviceChargeAmount,
        total: toNumber(structuredSummary.total) ?? textSummary.total,
        currency: structuredSummary.currency || textSummary.currency,
      };

      onParse?.({ items, rawText, summary: mergedSummary });
    } catch (err) {
      console.error("OCR scan failed", err);
      setStatus("Failed");
      onError?.("Failed to scan receipt with Gemini. Please try again with a clearer image.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={compact ? "mt-2 text-xs text-slate-400 space-y-1" : "my-4 space-y-2"}>
      <input
        ref={inputRef}
        id="ocr-upload"
        name="ocr-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {status && (
        <div>
          <span className="font-semibold text-emerald-200/80">Upload bill:</span>{" "}
          <span className="text-slate-300/90">{status}</span>
        </div>
      )}
    </div>
  );
});

export default OcrReader;
