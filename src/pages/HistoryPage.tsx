// src/pages/HistoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Receipt, Clock3, ChevronRight } from "../icons";
import { supabase } from "../supabaseClient";

const colorPalette = [
  { text: "text-sky-200", bg: "bg-sky-900/40", border: "border-sky-500/50" },
  { text: "text-amber-200", bg: "bg-amber-900/40", border: "border-amber-500/50" },
  { text: "text-fuchsia-200", bg: "bg-fuchsia-900/40", border: "border-fuchsia-500/50" },
  { text: "text-teal-200", bg: "bg-teal-900/40", border: "border-teal-500/50" },
  { text: "text-indigo-200", bg: "bg-indigo-900/40", border: "border-indigo-500/50" },
  { text: "text-rose-200", bg: "bg-rose-900/40", border: "border-rose-500/50" },
  { text: "text-lime-200", bg: "bg-lime-900/40", border: "border-lime-500/50" },
];

function colorForName(name = "") {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const idx = Math.abs(hash) % colorPalette.length;
  return colorPalette[idx];
}

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

function getUniqueParticipants(payload) {
  const p = payload || {};
  const bill = p.bill || {};
  const items = Array.isArray(bill.items) ? bill.items : [];
  const participantSet = new Set();

  items.forEach((item) => {
    const participants = Array.isArray(item?.participants) ? item.participants : [];
    participants.forEach((name) => {
      if (name && typeof name === 'string') {
        participantSet.add(name);
      }
    });
  });

  return Array.from(participantSet);
}

const BILLS_PER_PAGE = 20;

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // RLS automatically filters by user - no need for getUser() first
        // Fetch one extra to check if there are more pages
        const { data, error } = await supabase
          .from("bills")
          .select("id, title, currency, payload, created_at")
          .order("created_at", { ascending: false })
          .limit(BILLS_PER_PAGE + 1);

        if (error) throw error;

        if (!cancelled) {
          const hasMoreResults = data && data.length > BILLS_PER_PAGE;
          setHasMore(hasMoreResults);
          setRows(hasMoreResults ? data.slice(0, BILLS_PER_PAGE) : (data ?? []));
          setCurrentPage(0);
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

  // Load more bills
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const offset = nextPage * BILLS_PER_PAGE;

      // Fetch one extra to check if there are more pages
      const { data, error } = await supabase
        .from("bills")
        .select("id, title, currency, payload, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + BILLS_PER_PAGE);

      if (error) throw error;

      const hasMoreResults = data && data.length > BILLS_PER_PAGE;
      setHasMore(hasMoreResults);
      setRows(prev => [...prev, ...(hasMoreResults ? data.slice(0, BILLS_PER_PAGE) : (data ?? []))]);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const table = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        total: computeTotalFromPayload(r?.payload),
        participants: getUniqueParticipants(r?.payload),
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
    <div className="app-container page-container space-y-6 text-slate-100">
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 card-padding shadow-xl backdrop-blur">
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
        <>
          <div className="space-y-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/history/${r.id}`}
                className="flex flex-col gap-3 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur transition hover:border-emerald-600/50 hover:bg-slate-900/80"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
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
                  </div>
                </div>
                {r.participants && r.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.participants.map((name) => {
                      const color = colorForName(name);
                      return (
                        <span
                          key={name}
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.border} ${color.text}`}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Load More Button - show when there are more bills */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-apple btn-secondary min-w-[200px]"
              >
                {loadingMore ? "Loading..." : `Load More (${rows.length} of many)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
