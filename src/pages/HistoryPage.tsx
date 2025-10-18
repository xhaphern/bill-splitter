// @ts-nocheck
// src/pages/HistoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Receipt, Clock3, ChevronRight } from "../icons";
import { supabase } from "../supabaseClient";

function money(n, cur) {
  const x = Number(n);
  if (!Number.isFinite(x)) return `${cur} 0.00`;
  return `${cur} ${x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeTotalFromPayload(payload) {
  const p = payload || {};
  // Items are stored in p.bill.items, not p.items
  const bill = p.bill || {};
  const items = Array.isArray(bill.items) ? bill.items : [];

  const subtotal = items.reduce((acc, it) => {
    const qty = Number(it?.qty ?? 0);
    const price = Number(it?.price ?? 0);
    return acc + qty * price;
  }, 0);

  // accept both keys: sc|serviceCharge, gst|GST
  const scPct = Number(bill.sc ?? bill.serviceCharge ?? 0) / 100;
  const gstPct = Number(bill.gst ?? bill.GST ?? 0) / 100;

  const sc = subtotal * scPct;
  const gst = (subtotal + sc) * gstPct;
  return subtotal + sc + gst;
}

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // get user id to satisfy RLS and avoid scanning other users
        const { data: uData, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        const userId = uData?.user?.id;

        const query = supabase
          .from("bills")
          .select("id, title, currency, payload, created_at")
          .order("created_at", { ascending: false });

        // If your RLS policy requires user_id equality, include it:
        if (userId) query.eq("user_id", userId);

        const { data, error } = await query;
        if (error) throw error;

        if (!cancelled) {
          console.log("History data fetched:", data);
          setRows(data ?? []);
        }
      } catch (err) {
        console.error("History fetch failed:", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const table = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        total: computeTotalFromPayload(r?.payload),
      })),
    [rows]
  );

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return table;
    return table.filter((r) =>
      (r.title || "Untitled").toLowerCase().includes(query)
    );
  }, [table, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-slate-300">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 text-slate-100">
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Receipt className="text-emerald-300" size={20} /> History
            </h1>
            <p className="text-sm text-emerald-200/70">Your saved bills, ready to revisit.</p>
          </div>
          <div className="rounded-full border border-emerald-600/40 px-4 py-1.5 text-sm text-emerald-200">
            {table.length} saved
          </div>
        </div>
        <div className="mt-4 flex items-center rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <Search size={16} className="mr-2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved bills"
            className="w-full bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-sm text-slate-200/80 shadow-xl backdrop-blur">
          No bills yet. Save a split from the main page to see it here.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={`/history/${r.id}`}
              className="flex flex-col gap-3 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur transition hover:border-emerald-600/50 hover:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">{r.title || "Untitled"}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-emerald-200/80">
                  <Clock3 size={14} />
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.payload?.bill?.date && (
                  <div className="text-xs text-slate-400">
                    Bill date: {new Date(r.payload.bill.date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-xs uppercase tracking-wide text-emerald-200/70">Total</span>
                <span className="text-lg font-bold text-emerald-300">{money(r.total, r.currency || "MVR")}</span>
                <span className="text-xs text-emerald-200/70">Currency {r.currency || "MVR"}</span>
              </div>
              <ChevronRight className="hidden text-emerald-200 sm:block" size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
