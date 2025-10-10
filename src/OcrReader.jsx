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

const DEFAULT_ENDPOINT = "/.netlify/functions/scan-receipt";

const OcrReader = React.forwardRef(({ onParse, onError, onStart, compact = false }, ref) => {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
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
    if (!endpoint) return "";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!response.ok) throw new Error(`OCR request failed (${response.status})`);
    const payload = await response.json();
    return payload.text || "";
  };

  const runLocalOcr = async (file) => {
    setStatus("Processing on device");
    setProgress(0);

    const { recognize } = await import("tesseract.js");
    const { data } = await recognize(file, "eng", {
      logger: (m) => {
        if (m.progress) setProgress(Math.round((m.progress || 0) * 100));
        if (m.status) setStatus(m.status);
      },
    });

    return data.text || "";
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onStart?.();
    setIsProcessing(true);
    setProgress(0);

    try {
      setStatus("Uploading");
      const dataUrl = await fileToDataUrl(file);

      let text = "";
      try {
        setStatus("Scanning");
        text = await runRemoteOcr(dataUrl);
      } catch (remoteError) {
        if (endpoint) console.warn("Remote OCR failed, falling back to local", remoteError);
      }

      if (!text) {
        text = await runLocalOcr(file);
      }

      setStatus("Parsing");
      const items = parseOcrText(text);
      if (onParse) onParse(items, text);
      setStatus("Done");
    } catch (err) {
      console.error("OCR scan failed", err);
      setStatus("Failed");
      if (onError) onError("Failed to scan receipt. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
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
          {progress > 0 && progress < 100 && (
            <span className="ml-2 text-slate-400">{progress}%</span>
          )}
        </div>
      )}
    </div>
  );
});

export default OcrReader;
