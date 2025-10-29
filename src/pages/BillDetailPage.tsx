import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { supabase } from "../supabaseClient";
import { Download } from "../icons";
import type { Database, Json } from "../types/database";

type BillItem = {
  id?: string;
  name?: string | null;
  qty?: number | null;
  price?: number | null;
  participants?: string[] | null;
};

type BillFriend = {
  id?: string;
  name: string;
};

interface BillPayload {
  bill?: {
    items?: BillItem[];
    sc?: number | null;
    serviceCharge?: number | null;
    gst?: number | null;
    GST?: number | null;
    discount?: number | null;
    discount1?: number | null;
    discount2?: number | null;
    date?: string | null;
  };
  friends?: BillFriend[];
}

interface BillRecord {
  id: string;
  title: string | null;
  currency: string | null;
  created_at: string | null;
  payload: BillPayload | null;
}

type SummaryLine =
  | { kind: "base"; label: string; value: number }
  | { kind: "delta"; label: string; value: number }
  | { kind: "total"; label: string; value: number };

type Adjustment = {
  label: string;
  totalDelta: number;
};

const colorPalette = [
  { text: "text-sky-200", bg: "bg-sky-900/30", border: "border border-sky-500/40", dot: "bg-sky-400" },
  { text: "text-amber-200", bg: "bg-amber-900/30", border: "border border-amber-500/40", dot: "bg-amber-400" },
  { text: "text-fuchsia-200", bg: "bg-fuchsia-900/30", border: "border border-fuchsia-500/40", dot: "bg-fuchsia-400" },
  { text: "text-teal-200", bg: "bg-teal-900/30", border: "border border-teal-500/40", dot: "bg-teal-400" },
  { text: "text-indigo-200", bg: "bg-indigo-900/30", border: "border border-indigo-500/40", dot: "bg-indigo-400" },
  { text: "text-rose-200", bg: "bg-rose-900/30", border: "border border-rose-500/40", dot: "bg-rose-400" },
  { text: "text-lime-200", bg: "bg-lime-900/30", border: "border border-lime-500/40", dot: "bg-lime-400" },
] as const;

type PaletteEntry = (typeof colorPalette)[number];

function money(value: number | string | null | undefined, currency: string): string {
  const x = Number(value);
  if (!Number.isFinite(x)) return `${currency} 0.00`;
  return `${currency} ${x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function amount(value: number | string | null | undefined): string {
  const x = Number(value);
  if (!Number.isFinite(x)) return "0.00";
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function colorForName(name = ""): PaletteEntry {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const idx = Math.abs(hash) % colorPalette.length;
  return colorPalette[idx];
}

function coercePayload(payload: Json | null): BillPayload | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as BillPayload;
}

export default function BillDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<BillRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }

    const billId = id;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("bills")
          .select("id, title, currency, payload, created_at")
          .eq("id", billId)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          const typed: BillRecord | null = data
            ? {
                id: String((data as any).id),
                title: (data as { title?: string | null }).title ?? null,
                currency: (data as { currency?: string | null }).currency ?? null,
                created_at: (data as { created_at?: string | null }).created_at ?? null,
                payload: coercePayload((data as { payload?: Json | null }).payload ?? null),
              }
            : null;
          setRow(typed);
        }
      } catch (err) {
        console.error("Bill detail fetch failed:", err);
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Extract data before early returns to avoid hook order issues
  const { bill, friends = [] } = row?.payload ?? {};
  const items = Array.isArray(bill?.items) ? bill.items ?? [] : [];

  const serviceChargePercent = Number(bill?.sc ?? bill?.serviceCharge ?? 0);
  const gstPercent = Number(bill?.gst ?? bill?.GST ?? 0);

  const currency = row?.currency || "MVR";
  const createdAt = row?.created_at ? new Date(row.created_at) : null;
  const billDate = bill?.date ? new Date(bill.date) : null;

  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it?.qty ?? 0);
    const price = Number(it?.price ?? 0);
    return sum + qty * price;
  }, 0);

  const { perUserTotals, adjustments } = useMemo(() => {
    const baseTotals: Record<string, number> = {};
    friends.forEach((friend) => {
      if (friend?.name) baseTotals[friend.name] = 0;
    });

    items.forEach((item) => {
      const qty = Number(item?.qty ?? 0);
      const price = Number(item?.price ?? 0);
      const participants = Array.isArray(item?.participants) ? item.participants : [];
      if (!participants.length) return;
      const itemTotal = qty * price;
      const sharePerPerson = participants.length ? itemTotal / participants.length : 0;
      participants.forEach((participant) => {
        baseTotals[participant] = (baseTotals[participant] || 0) + sharePerPerson;
      });
    });

    const runningTotals = { ...baseTotals };
    const adjustmentList: Adjustment[] = [];

    const applyStage = (pct: number, label: string, isDiscount: boolean) => {
      if (!pct || !Number.isFinite(pct)) return;
      const change = { label, totalDelta: 0 };
      Object.entries(runningTotals).forEach(([name, base]) => {
        const delta = base * (pct / 100) * (isDiscount ? -1 : 1);
        runningTotals[name] = base + delta;
        change.totalDelta += delta;
      });
      adjustmentList.push(change);
    };

    const discount1Pct = Number(bill?.discount1 ?? bill?.discount ?? 0);
    const discount2Pct = Number(bill?.discount2 ?? 0);
    const serviceChargePct = Number(bill?.sc ?? bill?.serviceCharge ?? 0);
    const gstPct = Number(bill?.gst ?? bill?.GST ?? 0);

    applyStage(discount1Pct, `Discount 1 (${discount1Pct}%)`, true);
    applyStage(serviceChargePct, `Service Charge (${serviceChargePct}%)`, false);
    applyStage(discount2Pct, `Discount 2 (${discount2Pct}%)`, true);
    applyStage(gstPct, `GST (${gstPct}%)`, false);

    return {
      perUserTotals: runningTotals,
      adjustments: adjustmentList,
    };
  }, [bill, friends, items]);

  if (loading) return <div className="p-6 text-slate-300">Loading…</div>;

  if (!row) {
    return (
      <div className="p-6 space-y-4 text-slate-300">
        <div className="mb-4">Bill not found.</div>
        <Link to="/history" className="btn-neo-ghost">
          Back to History
        </Link>
      </div>
    );
  }

  const total = Object.values(perUserTotals).reduce((acc, val) => acc + val, 0);

  const serviceAdjustment = adjustments.find((adj) => adj.label.startsWith("Service Charge"));
  const gstAdjustment = adjustments.find((adj) => adj.label.startsWith("GST"));
  const discountAdjustments = adjustments.filter((adj) =>
    adj.label.toLowerCase().includes("discount"),
  );

  const toDeltaLine = (label: string, value: number): SummaryLine => ({
    kind: "delta",
    label,
    value,
  });

  const detailSummaryLines: SummaryLine[] = [
    { kind: "base", label: "Subtotal", value: subtotal },
    ...(serviceAdjustment ? [toDeltaLine(serviceAdjustment.label, serviceAdjustment.totalDelta)] : []),
    ...(gstAdjustment ? [toDeltaLine(gstAdjustment.label, gstAdjustment.totalDelta)] : []),
    ...discountAdjustments.map<SummaryLine>((adj) => toDeltaLine(adj.label, adj.totalDelta)),
    { kind: "total", label: "Total", value: total },
  ];

  const exportBill = async (type: "png" | "jpeg" = "png") => {
    const container = exportRef.current;
    if (!container) return;
    try {
      setExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#05070b",
        useCORS: true,
      });
      const mime = type === "jpeg" ? "image/jpeg" : "image/png";
      const data = canvas.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      link.href = data;
      link.download = `${row.title || "bill"}.${type === "jpeg" ? "jpg" : "png"}`;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-container p-6 space-y-4 text-slate-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-500 hover:text-white"
        >
          ← Back to History
        </Link>
        <button
          onClick={() => exportBill("png")}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export PNG"}
        </button>
      </div>

      <div ref={exportRef} className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 sm:p-6 shadow-xl backdrop-blur space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{row.title || "Untitled Bill"}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
              <span>Created: {createdAt ? createdAt.toLocaleString() : "Unknown"}</span>
              <span>Currency: {currency}</span>
              {serviceChargePercent > 0 && <span>S/C: {serviceChargePercent}%</span>}
              {gstPercent > 0 && <span>GST: {gstPercent}%</span>}
              {billDate && <span>Bill date: {billDate.toLocaleDateString()}</span>}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60">
          {/* Mobile list view */}
          <div className="sm:hidden">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                No items found in this bill.
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {items.map((it, index) => {
                  const qty = Number(it.qty ?? 0);
                  const price = Number(it.price ?? 0);
                  const rowTotal = qty * price;
                  const who = Array.isArray(it.participants) ? it.participants : [];
                  return (
                    <div
                      key={it.id ?? `${it.name}-${index}`}
                      className="rounded-2xl border border-slate-700/40 bg-slate-900/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white break-words mr-2">
                          {it.name || "Item"}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total ({currency})</div>
                          <div className="text-base font-bold text-white">{amount(rowTotal)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-2 py-0.5">Qty: {qty}</span>
                      </div>
                      {who.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {who.map((n) => {
                            const color = colorForName(n);
                            return (
                              <span
                                key={n}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${color.bg} ${color.border} ${color.text}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${color.dot}`}></span>
                                {n}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop/Tablet table */}
          <div className="hidden sm:block overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[2fr,80px,120px,1fr] gap-4 px-4 py-3 text-sm font-medium text-slate-200 bg-slate-950/60">
                <div>Item</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Total ({currency})</div>
                <div>Participants</div>
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400">
                  No items found in this bill.
                </div>
              ) : (
                <div>
                  {items.map((it, index) => {
                    const qty = Number(it.qty ?? 0);
                    const price = Number(it.price ?? 0);
                    const rowTotal = qty * price;
                    const who = Array.isArray(it.participants) ? it.participants : [];
                    return (
                      <div
                        key={it.id ?? `${it.name}-${index}`}
                        className={`grid grid-cols-[2fr,80px,120px,1fr] items-center gap-4 px-4 py-3 border-t border-slate-700/40 ${
                          index % 2 === 0 ? "bg-slate-900/50" : "bg-slate-900/30"
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{it.name || "Item"}</div>
                        <div className="text-center text-slate-300">{qty}</div>
                        <div className="text-right font-semibold text-white">{amount(rowTotal)}</div>
                        <div className="flex flex-wrap gap-1">
                          {who.map((n) => {
                            const color = colorForName(n);
                            return (
                              <span
                                key={n}
                                className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium ${color.bg} ${color.border} ${color.text}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${color.dot}`}></span>
                                {n}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Bill summary</h2>
          <div className="mt-1 space-y-2 text-sm">
            {detailSummaryLines.map((line, idx) => {
              const formattedValue =
                line.kind === "delta"
                  ? `${line.value < 0 ? "-" : "+"}${money(Math.abs(line.value), currency)}`
                  : money(line.value, currency);
              return (
                <div key={`bill-summary-${idx}`} className="flex items-center justify-between">
                  <span className={line.kind === "total" ? "text-white font-semibold" : "text-slate-300"}>
                    {line.label.replace("S/C", "Service Charge")}
                  </span>
                  <span
                    className={
                      line.kind === "total"
                        ? "text-emerald-300 text-lg font-bold"
                        : line.kind === "base"
                        ? "text-white font-semibold"
                        : line.value < 0
                        ? "text-red-200 font-medium"
                        : "text-slate-200 font-medium"
                    }
                  >
                    {formattedValue}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-xs uppercase tracking-wide text-emerald-200/70">Per person</div>
            {Object.entries(perUserTotals).map(([user, value]) => {
              const color = colorForName(user);
              return (
                <div
                  key={`summary-${user}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${color.bg} ${color.border}`}
                >
                  <span className={`inline-flex items-center gap-2 ${color.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`}></span>
                    {user}
                  </span>
                  <span className={`${color.text}`}>{money(value, currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
