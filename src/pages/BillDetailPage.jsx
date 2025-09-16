// src/pages/BillDetailPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";

function money(n, cur) {
  const x = Number(n);
  if (!Number.isFinite(x)) return `${cur} 0.00`;
  return `${cur} ${x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function amount(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const colorPalette = [
  { text: "text-sky-200", bg: "bg-sky-900/30", border: "border border-sky-500/40", dot: "bg-sky-400" },
  { text: "text-amber-200", bg: "bg-amber-900/30", border: "border border-amber-500/40", dot: "bg-amber-400" },
  { text: "text-fuchsia-200", bg: "bg-fuchsia-900/30", border: "border border-fuchsia-500/40", dot: "bg-fuchsia-400" },
  { text: "text-teal-200", bg: "bg-teal-900/30", border: "border border-teal-500/40", dot: "bg-teal-400" },
  { text: "text-indigo-200", bg: "bg-indigo-900/30", border: "border border-indigo-500/40", dot: "bg-indigo-400" },
  { text: "text-rose-200", bg: "bg-rose-900/30", border: "border border-rose-500/40", dot: "bg-rose-400" },
  { text: "text-lime-200", bg: "bg-lime-900/30", border: "border border-lime-500/40", dot: "bg-lime-400" },
];

function colorForName(name = "") {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const idx = Math.abs(hash) % colorPalette.length;
  return colorPalette[idx];
}

export default function BillDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("bills")
          .select("id, title, currency, payload, created_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          console.log("Bill detail data:", data);
          console.log("Bill payload:", data?.payload);
          setRow(data ?? null);
        }
      } catch (err) {
        console.error("Bill detail fetch failed:", err);
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="p-6 text-slate-300">Loading…</div>;

  if (!row) {
    return (
      <div className="p-6 text-slate-300">
        <div className="mb-4">Bill not found.</div>
        <Link to="/history" className="btn-neo-ghost">
          Back to History
        </Link>
      </div>
    );
  }

  const p = row.payload || {};
  // Items are stored in p.bill.items, not p.items
  const bill = p.bill || {};
  const items = Array.isArray(bill.items) ? bill.items : [];

  // Accept older/newer payload keys
  const scPct = Number(bill.sc ?? bill.serviceCharge ?? 0) / 100;
  const gstPct = Number(bill.gst ?? bill.GST ?? 0) / 100;

  const currency = row.currency || "MVR";

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.qty ?? 0) * Number(it.price ?? 0),
    0
  );

  // Calculate per-user totals
  const friends = p.friends || [];
  const baseTotals = {};
  // Initialize all friends with 0
  friends.forEach(f => {
    baseTotals[f.name] = 0;
  });

  // Calculate each user's share of items
  items.forEach(item => {
    const itemTotal = Number(item.qty ?? 0) * Number(item.price ?? 0);
    const participants = item.participants || [];
    if (participants.length > 0) {
      const sharePerPerson = itemTotal / participants.length;
      participants.forEach(participant => {
        baseTotals[participant] = (baseTotals[participant] || 0) + sharePerPerson;
      });
    }
  });

  const runningTotals = { ...baseTotals };
  const adjustments = [];

  const stage = (pct, label, isDiscount) => {
    if (!pct || !Number.isFinite(pct)) return;
    const change = { label, totalDelta: 0 };
    Object.entries(runningTotals).forEach(([name, base]) => {
      const delta = base * (pct / 100) * (isDiscount ? -1 : 1);
      runningTotals[name] = base + delta;
      change.totalDelta += delta;
    });
    adjustments.push(change);
  };

  const discount1Pct = Number(bill.discount1 ?? bill.discount ?? 0);
  const discount2Pct = Number(bill.discount2 ?? 0);
  const serviceChargePct = Number(bill.sc ?? bill.serviceCharge ?? 0);
  const gstPercent = Number(bill.gst ?? bill.GST ?? 0);

  stage(discount1Pct, `Discount 1 (${discount1Pct}%)`, true);
  stage(serviceChargePct, `Service Charge (${serviceChargePct}%)`, false);
  stage(discount2Pct, `Discount 2 (${discount2Pct}%)`, true);
  stage(gstPercent, `GST (${gstPercent}%)`, false);

  const perUserTotals = runningTotals;
  const total = Object.values(perUserTotals).reduce((acc, val) => acc + val, 0);

  const serviceAdjustment = adjustments.find((adj) => adj.label.startsWith('Service Charge'));
  const gstAdjustment = adjustments.find((adj) => adj.label.startsWith('GST'));
  const discountAdjustments = adjustments.filter((adj) => adj.label.toLowerCase().includes('discount'));

  const detailSummaryLines = useMemo(
    () => [
      { kind: 'base', label: 'Subtotal', value: subtotal },
      ...(serviceAdjustment
        ? [{ kind: 'delta', label: serviceAdjustment.label, value: serviceAdjustment.totalDelta }]
        : []),
      ...(gstAdjustment
        ? [{ kind: 'delta', label: gstAdjustment.label, value: gstAdjustment.totalDelta }]
        : []),
      ...discountAdjustments.map((adj) => ({ kind: 'delta', label: adj.label, value: adj.totalDelta })),
      { kind: 'total', label: 'Total', value: total },
    ],
    [subtotal, total, serviceAdjustment, gstAdjustment, discountAdjustments]
  );

  const exportBill = async (type = "png") => {
    if (!exportRef.current) return;
    try {
      setExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(exportRef.current, {
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
    <div className="mx-auto max-w-5xl p-6 text-slate-100">
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

      <div ref={exportRef} className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{row.title || "Untitled Bill"}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
              <span>Created: {new Date(row.created_at).toLocaleString()}</span>
              <span>Currency: {currency}</span>
              {scPct > 0 && <span>S/C: {(scPct * 100).toFixed(0)}%</span>}
              {gstPct > 0 && <span>GST: {(gstPct * 100).toFixed(0)}%</span>}
              {bill.date && <span>Bill date: {new Date(bill.date).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60">
          <div className="grid grid-cols-[2fr,80px,120px,1fr] gap-4 px-4 py-3 text-sm font-medium text-slate-200 bg-slate-950/60">
            <div>Item</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Total ({currency})</div>
            <div>Participants</div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">
              No items found in this bill. This bill was likely saved without any items.
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

        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">Amount per person</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(perUserTotals).map(([user, value]) => {
              const color = colorForName(user);
              return (
                <div
                  key={user}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 backdrop-blur ${color.bg} ${color.border}`}
                >
                  <span className={`inline-flex items-center gap-2 font-semibold ${color.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`}></span>
                    {user}
                  </span>
                  <span className={`font-semibold ${color.text}`}>{money(value, currency)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Bill summary</h2>
          <div className="mt-1 space-y-2 text-sm">
            {detailSummaryLines.map((line, idx) => {
              const formattedValue =
                line.kind === 'delta'
                  ? `${line.value < 0 ? '-' : '+'}${money(Math.abs(line.value), currency)}`
                  : money(line.value, currency);
              return (
                <div key={`bill-summary-${idx}`} className="flex items-center justify-between">
                  <span className={line.kind === 'total' ? 'text-white font-semibold' : 'text-slate-300'}>
                    {line.label.replace('S/C', 'Service Charge')}
                  </span>
                  <span
                    className={
                      line.kind === 'total'
                        ? 'text-emerald-300 text-lg font-bold'
                        : line.kind === 'base'
                        ? 'text-white font-semibold'
                        : line.value < 0
                        ? 'text-red-200 font-medium'
                        : 'text-slate-200 font-medium'
                    }
                  >
                    {formattedValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
