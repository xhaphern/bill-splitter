// @ts-nocheck
import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Users,
  Receipt,
  Calculator,
  Download,
  Pencil,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Share2,
  Copy,
  ChevronDown,
  FileText,
  MoreVertical,
  Calendar,
  Upload,
  ScanText,
  SaveIcon,
} from "./icons";
import html2canvas from "html2canvas";
import { saveBill } from "./api/supaBills";
import { colorFromName, hueFromName, colorFromHue, meColor } from "./utils/colors";
import { fetchCircles, fetchCircleMembers, fetchCircleMemberCounts } from "./api/supaCircles";
import { supabase } from "./supabaseClient";
import OcrReader from "./OcrReader";
import CameraOverlay from "./components/CameraOverlay";

const STORAGE_FRIENDS = "bs_friends_v1";
const STORAGE_BILL   = "bs_bill_v1";
const currencySymbols = { MVR: "MVR ", USD: "$", EUR: "€", GBP: "£", INR: "₹", SGD: "S$", AUD: "A$", CAD: "C$", JPY: "¥" };
const fmt = (n) => (Number(n) || 0).toFixed(2);
const EMPTY_SCAN_SUMMARY = {
  subtotal: null,
  serviceChargeAmount: null,
  total: null,
  currency: null,
};

const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");

const parseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

function SettingInput({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3">
      <span className="text-xs uppercase tracking-wide text-emerald-200/80">{label}</span>
      <div className="relative mt-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-xl border border-slate-700/70 bg-transparent py-2 pl-3 pr-10 text-sm font-medium text-slate-100 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300/80">%</span>
      </div>
    </div>
  );
}

const toneMap = {
  default: {
    border: "",
    bg: "bg-slate-800/70",
    icon: "bg-slate-700/50 text-slate-200",
  },
  emerald: {
    border: "",
    bg: "bg-emerald-900/40",
    icon: "bg-emerald-500/25 text-emerald-200",
  },
  indigo: {
    border: "",
    bg: "bg-indigo-900/40",
    icon: "bg-indigo-500/25 text-indigo-200",
  },
  cyan: {
    border: "",
    bg: "bg-cyan-900/40",
    icon: "bg-cyan-500/25 text-cyan-200",
  },
};

function ActionButton({ icon, label, onClick, tone = "default" }) {
  const palette = toneMap[tone] ?? toneMap.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex h-12 w-12 items-center justify-center rounded-2xl ${palette.bg} text-white shadow transition hover:bg-white/10`}
      aria-label={label}
      title={label}
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${palette.icon}`}>
        {icon}
      </span>
    </button>
  );
}

const DownloadButton = forwardRef(function DownloadButton({ onSelect, open, setOpen }, ref) {
  const palette = toneMap.cyan;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group inline-flex h-12 w-12 items-center justify-center rounded-2xl ${palette.bg} text-white shadow transition hover:bg-white/10`}
        aria-label="Download"
      >
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${palette.icon}`}>
          <Download size={18} />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 -top-2 z-30 mt-2 w-52 -translate-y-full transform rounded-2xl border border-cyan-600/60 bg-slate-950/95 p-2 text-sm text-slate-100 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onSelect("full");
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-2 text-left hover:bg-cyan-500/20"
          >
            Full export (items + totals)
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect("summary");
              setOpen(false);
            }}
            className="mt-1 block w-full rounded-xl px-3 py-2 text-left hover:bg-cyan-500/20"
          >
            Summary export (totals only)
          </button>
        </div>
      )}
    </div>
  );
});

export default function BillSplitter({ session }) {
  // ---- Friends (participants for this bill) and catalog/circles ----
  const [friends, setFriends] = useState([]); // participants for this bill
  const [friendCatalog, setFriendCatalog] = useState([]); // saved friends (signed-in)
  const [circles, setCircles] = useState([]);
  const [circleCounts, setCircleCounts] = useState({});
  const [selectedCircle, setSelectedCircle] = useState("");
  const [friendSearch, setFriendSearch] = useState("");

  // Load saved friends catalog: from Supabase when signed in; anonymous has none
  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) { setFriendCatalog([]); setFriends([]); setCircles([]); return; }

      try {
        const { data, error } = await supabase
          .from('friends')
          .select('id, name, account, phone')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setFriendCatalog((data || []).map((row) => ({ ...row, phone: row.phone || "" })));
        try { const counts = await fetchCircleMemberCounts(session.user.id); setCircleCounts(counts); } catch {}
      } catch (err) {
        console.error('Failed to load friends:', err);
        setFriendCatalog([]);
      }
    };

    load();
  }, [session?.user?.id]);

  // Load circles (optional tables). Failure will simply show no circles
  useEffect(() => {
    const loadCircles = async () => {
      if (!session?.user?.id) return;
      const rows = await fetchCircles(session.user.id);
      setCircles(rows);
    };
    loadCircles();
  }, [session?.user?.id]);

  // When a circle is selected, fetch members and set as participants
  useEffect(() => {
    const loadMembers = async () => {
      if (!session?.user?.id) return;
      if (!selectedCircle) return;
      const members = await fetchCircleMembers(session.user.id, selectedCircle);
      // Avoid duplicates: merge with existing participants
      setFriends((prev) => {
        const merged = [...prev];
        const nameKeys = new Set(prev.map((f) => f.name));
        const phoneKeys = new Set(prev.map((f) => normalizePhone(f.phone || "")));
        members.forEach((m) => {
          const nextPhone = normalizePhone(m.phone || "");
          if (nextPhone) {
            if (phoneKeys.has(nextPhone)) return;
            phoneKeys.add(nextPhone);
          } else if (nameKeys.has(m.name)) {
            return;
          } else {
            nameKeys.add(m.name);
          }
          merged.push({ ...m, phone: m.phone || "" });
        });
        return merged;
      });
    };
    loadMembers();
  }, [selectedCircle, session?.user?.id]);


  // Get current user's name and account from stored preferences
  // Default to "You" for anonymous users; override after session/meta loads
  const [userDisplayName, setUserDisplayName] = useState('You');
  
  const [userAccount, setUserAccount] = useState(() => {
    try { return (localStorage.getItem('user_account') || '').slice(0, 13); } 
    catch { return ''; }
  });
  
  // Update localStorage when userDisplayName or userAccount changes
  useEffect(() => {
    if (session?.user?.id) {
      try { localStorage.setItem('user_display_name', userDisplayName); } catch {}
    }
  }, [userDisplayName, session?.user?.id]);
  
  useEffect(() => {
    if (session?.user?.id) {
      try { localStorage.setItem('user_account', userAccount); } catch {}
    }
  }, [userAccount, session?.user?.id]);

  const currentUserName = userDisplayName;

  const profileSyncReady = useRef(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    profileSyncReady.current = false;
  }, [session?.user?.id]);

  useEffect(() => {
    const meta = session?.user?.user_metadata;
    if (!meta) return;
    if (meta.display_name && meta.display_name !== userDisplayName) {
      setUserDisplayName(meta.display_name);
    }
    if (meta.account_number && meta.account_number.slice(0, 13) !== userAccount) {
      setUserAccount(meta.account_number.slice(0, 13));
    }
  }, [session?.user?.user_metadata?.display_name, session?.user?.user_metadata?.account_number]);
  
  // All participants (current user + friends)
  const allParticipants = [
    { name: currentUserName, account: userAccount, isCurrentUser: true },
    ...friends.map(f => ({ ...f, isCurrentUser: false }))
  ];

  // Friend management
  const [newFriend, setNewFriend] = useState({ name: "", phone: "", account: "" });
  const [showAddFriend, setShowAddFriend] = useState(false);

  const addFriend = async () => {
    const name = newFriend.name.trim();
    if (!name) return notify("Friend name is required", "warning");
    const normalizedPhone = normalizePhone(newFriend.phone);
    const digitsLength = normalizedPhone.length;

    if (session?.user?.id) {
      if (!digitsLength) return notify("Mobile number is required", "warning");
      if (digitsLength < 7) return notify("Mobile number must be at least 7 digits", "warning");
    } else if (digitsLength && digitsLength < 7) {
      return notify("Enter at least 7 digits for the mobile number", "warning");
    }

    if (digitsLength) {
      if (!session?.user?.id) {
        const duplicateLocal = friends.some((f) => normalizePhone(f.phone || "") === normalizedPhone);
        if (duplicateLocal) return notify("This mobile number is already on the list", "warning");
      } else {
        const duplicateCatalog = friendCatalog.some((f) => normalizePhone(f.phone || "") === normalizedPhone);
        if (duplicateCatalog) return notify("This mobile number is already saved", "warning");
        const duplicateParticipant = friends.some((f) => normalizePhone(f.phone || "") === normalizedPhone);
        if (duplicateParticipant) return notify("This mobile number is already on the participant list", "warning");
      }
    }

    // Anonymous: add to local list only
    if (!session?.user?.id) {
      setFriends((list) => [
        ...list,
        {
          id: `local-${Date.now()}`,
          name,
          phone: digitsLength ? normalizedPhone : "",
          account: newFriend.account.trim().slice(0, 13) || null,
        },
      ]);
      setNewFriend({ name: "", phone: "", account: "" });
      setShowAddFriend(false);
      notify("Friend added to this bill ✅", "success");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('friends')
        .insert({ 
          user_id: session.user.id, 
          name: name, 
          phone: normalizedPhone,
          account: newFriend.account.trim().slice(0, 13) || null 
        });

      if (error) throw error;
      
    setNewFriend({ name: "", phone: "", account: "" });
      setShowAddFriend(false);
      notify("Friend added successfully ✅", "success");
      // Refresh catalogs (not participants)
      const { data, error: fetchError } = await supabase
        .from('friends')
        .select('id, name, account, phone')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (!fetchError) setFriendCatalog((data || []).map((row) => ({ ...row, phone: row.phone || "" })));
    } catch (err) {
      console.error('Failed to add friend:', err);
      notify("Failed to add friend", "error");
    }
  };

  const removeFriend = (friendId, friendName) => {
    // Remove from this bill only; don't delete saved friend records
    setBill((s) => ({
      ...s,
      items: s.items.map((it) => ({
        ...it,
        participants: (it.participants || []).filter((p) => p !== friendName),
      })),
      payer: s.payer === friendName ? "" : s.payer,
    }));

    setFriends((list) =>
      list.filter((f) => (f.id ?? f.name) !== (friendId ?? friendName))
    );
    notify("Removed from this bill ✅", "success");
  };

  // ---- Bill state (persist anonymous; persist to localStorage only when signed in) ----
  const defaultBill = {
    title: "",
    date: "",
    currency: "MVR",
    discount1: 0,
    serviceCharge: 10,
    discount2: 0,
    gst: 8,
    payer: "",
    items: [],
  };

  const [bill, setBill] = useState(() => {
    if (!session?.user?.id) return defaultBill;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_BILL));
      return stored ? { ...defaultBill, ...stored } : defaultBill;
    } catch {
      return defaultBill;
    }
  });

  // Only persist bill to localStorage when signed in; anonymous is in-memory only
  useEffect(() => {
    if (session?.user?.id) {
      try { localStorage.setItem(STORAGE_BILL, JSON.stringify(bill)); } catch {}
    }
  }, [bill, session?.user?.id]);

  // Clear any leftover stored bill for anonymous sessions
  useEffect(() => {
    if (!session?.user?.id) {
      try { localStorage.removeItem(STORAGE_BILL); } catch {}
    }
  }, [session?.user?.id]);

  const currencyPrefix = currencySymbols[bill.currency] ?? "";
  const dense = allParticipants.length > 7; // auto-compact when many columns

  // ---- Item modal ----
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", qty: "1", price: "", participants: [] });

  const openAddItem = () => {
    setEditingId(null);
    // Start with no one selected; user picks participants explicitly
    setItemForm({ name: "", qty: "1", price: "", participants: [] });
    setShowItemModal(true);
  };
  const openEditItem = (it) => {
    setEditingId(it.id);
    setItemForm({
      name: it.name || "",
      qty: String(it.qty ?? "1"),
      price: (it.price ?? "") === "" ? "" : String(it.price),
      participants: it.participants || []
    });
    setShowItemModal(true);
  };
  const toggleFormParticipant = (name) => {
    setItemForm(f => ({
      ...f,
      participants: f.participants.includes(name)
        ? f.participants.filter(p => p !== name)
        : [...f.participants, name]
    }));
  };
  const saveItemForm = () => {
    const name = itemForm.name.trim();
    const qtyNum   = Number(itemForm.qty);
    const priceNum = itemForm.price === "" ? NaN : Number(itemForm.price);
    const participants = itemForm.participants;
    if (!name) return notify("Item name required.", "warning");
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return notify("Quantity must be a positive number.", "warning");
    if (!Number.isFinite(priceNum) || priceNum < 0) return notify("Price must be 0 or greater.", "warning");
    if (!participants.length) return notify("Select at least one participant.", "warning");
    if (editingId) {
      setBill(s => ({
        ...s,
        items: s.items.map(it => it.id === editingId ? { ...it, name, qty: qtyNum, price: priceNum, participants } : it)
      }));
    } else {
      setBill(s => ({ ...s, items: [...s.items, { id: Date.now(), name, qty: qtyNum, price: priceNum, participants }] }));
    }
    setShowItemModal(false);
  };
  const deleteItem = (id) => setBill(s => ({ ...s, items: s.items.filter(it => it.id !== id) }));

  // ---- Math ----
  const calc = useMemo(() => {
    const perParticipantSubtotal = Object.fromEntries(allParticipants.map(p => [p.name, 0]));
    let subtotal = 0;
    bill.items.forEach(it => {
      const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
      subtotal += rowTotal;
      const sel = it.participants || [];
      if (rowTotal > 0 && sel.length) {
        const share = rowTotal / sel.length;
        sel.forEach(p => { perParticipantSubtotal[p] = (perParticipantSubtotal[p] || 0) + share; });
      }
    });

    const run = { ...perParticipantSubtotal };
    const stage = (pct, isDiscount) => {
      const delta = {}; let totalDelta = 0;
      Object.entries(run).forEach(([name, base]) => {
        const x = (isDiscount ? -1 : 1) * base * (pct / 100);
        delta[name] = x; run[name] = base + x; totalDelta += x;
      });
      return { delta, totalDelta };
    };

    const rows = [];
    const d1 = Number(bill.discount1)||0, sc = Number(bill.serviceCharge)||0, d2=Number(bill.discount2)||0, gst=Number(bill.gst)||0;
    if (d1>0) rows.push({ label:`Discount 1 (${d1}%)`, ...stage(d1,true) });
    if (sc>0) rows.push({ label:`S/C (${sc}%)`,      ...stage(sc,false) });
    if (d2>0) rows.push({ label:`Discount 2 (${d2}%)`,...stage(d2,true) });
    if (gst>0) rows.push({ label:`GST (${gst}%)`,     ...stage(gst,false) });

    const perParticipantPayable = run;
    const grandPayable = Object.values(run).reduce((a,b)=>a+b,0);

    return { perParticipantSubtotal, grandSubtotal: subtotal, rows, perParticipantPayable, grandPayable };
  }, [bill.items, bill.discount1, bill.serviceCharge, bill.discount2, bill.gst, allParticipants]);

  const cellShare = (it, name) => {
    const total = Number(it.qty || 0) * Number(it.price || 0);
    const sel = it.participants || [];
    if (!sel.includes(name) || sel.length===0) return 0;
    return total / sel.length;
  };

  const serviceRow = calc.rows.find((row) => row.label.startsWith('S/C'));
  const gstRow = calc.rows.find((row) => row.label.startsWith('GST'));
  const discountRows = calc.rows.filter((row) => row.label.toLowerCase().includes('discount'));

  const summaryLines = [
    { kind: 'base', label: 'Subtotal', value: calc.grandSubtotal },
    ...(serviceRow
      ? [
          {
            kind: 'delta',
            label: serviceRow.label.replace('S/C', 'Service Charge'),
            value: serviceRow.totalDelta,
          },
        ]
      : []),
    ...(gstRow
      ? [
          {
            kind: 'delta',
            label: gstRow.label,
            value: gstRow.totalDelta,
          },
        ]
      : []),
    ...discountRows.map((row) => ({ kind: 'delta', label: row.label, value: row.totalDelta })),
    { kind: 'total', label: 'Total', value: calc.grandPayable },
  ];

  // ---- Export (hide actions) ----
  const exportRef = useRef(null);
  const summaryRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef(null);
  const ocrReaderRef = useRef(null);

  // ---- Toast (nice popup) ----
const [toast, setToast] = useState(null); // { msg, kind: 'success'|'warning'|'error' }
function notify(msg, kind = 'success') {
  setToast({ msg, kind });
  window.clearTimeout(notify._t);
  notify._t = window.setTimeout(() => setToast(null), 2600);
}

  const [showOcrModal, setShowOcrModal] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [scannedText, setScannedText] = useState("");
  const [scannedSummary, setScannedSummary] = useState(EMPTY_SCAN_SUMMARY);

  const mergeScannedItems = (items) => {
    const merged = [];
    items.forEach((item) => {
      const trimmedName = (item.name || "").trim();
      const isModifierLabel =
        trimmedName.startsWith("-") ||
        trimmedName.startsWith("+") ||
        trimmedName.startsWith("(") ||
        trimmedName.toLowerCase().startsWith("add ");
      const isZeroAddon = Number(item.price) === 0 && trimmedName && merged.length > 0;

      if ((isModifierLabel || isZeroAddon) && merged.length > 0) {
        const last = merged[merged.length - 1];
        const sanitized = trimmedName.replace(/^[+\-()]/, "").trim();
        last.name = sanitized ? `${last.name} ${sanitized}` : last.name;
        last.price = Number((Number(last.price) + Number(item.price || 0)).toFixed(2));
        return;
      }

      merged.push({ ...item, name: trimmedName || item.name });
    });

    return merged;
  };

  const handleOcrItems = (result) => {
    const items = Array.isArray(result?.items) ? result.items : [];
    const rawText = typeof result?.rawText === "string" ? result.rawText : "";
    const summary = result?.summary || {};

    if (!items.length) {
      notify("No totals found in the scanned receipt.", "warning");
      return;
    }

    const normalizedSummary = {
      subtotal: parseNumber(summary.subtotal),
      serviceChargeAmount: parseNumber(
        summary.serviceChargeAmount ?? summary.serviceCharge
      ),
      total: parseNumber(summary.total),
      currency:
        typeof summary.currency === "string" && summary.currency.trim()
          ? summary.currency
          : null,
    };
    setScannedSummary(normalizedSummary);

    const normalized = items.map((item, idx) => ({
      tempId: Date.now() + idx,
      name: item.name || `Scanned item ${idx + 1}`,
      qty: item.qty ? String(item.qty) : "1",
      price: item.price !== undefined ? String(item.price) : "0",
      participants: Array.isArray(item.participants) && item.participants.length
        ? item.participants
        : [],
    }));

    const merged = mergeScannedItems(normalized);

    setShowItemModal(false);
    setScannedItems(merged);
    setScannedText(rawText || "");
    setShowOcrModal(true);
  };

  const handleOcrError = (message) => {
    notify(message || "Failed to scan receipt.", "error");
  };

  const updateScannedItem = (index, patch) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const toggleScannedParticipant = (index, name) => {
    setScannedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const exists = item.participants.includes(name);
        return {
          ...item,
          participants: exists
            ? item.participants.filter((p) => p !== name)
            : [...item.participants, name],
        };
      })
    );
  };

  const computeTotalsForItems = (items, adjustments) => {
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const price = Number(item.price ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);

    let running = subtotal;
    const applyStage = (pct, type) => {
      const rate = Number(pct) || 0;
      if (!rate) return;
      const delta = running * (rate / 100);
      running = type === 'minus' ? running - delta : running + delta;
    };

    applyStage(adjustments.discount1, 'minus');
    applyStage(adjustments.serviceCharge, 'plus');
    applyStage(adjustments.discount2, 'minus');
    applyStage(adjustments.gst, 'plus');

    return { subtotal, total: running };
  };

  const formatMoney = (amount, currencyCode) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '';
    const code = currencyCode || bill.currency || 'MVR';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (err) {
      return `${code} ${value.toFixed(2)}`;
    }
  };

  const discardScannedItems = () => {
    setShowOcrModal(false);
    setScannedItems([]);
    setScannedText("");
    setScannedSummary(EMPTY_SCAN_SUMMARY);
  };

  const commitScannedItems = () => {
    const summaryForCommit = scannedSummary;
    const hadExistingItems = bill.items.length > 0;
    if (!scannedItems.length) {
      setShowOcrModal(false);
      return;
    }

    const normalized = [];
    let newItemsSubtotal = 0;
    for (const item of scannedItems) {
      const name = item.name.trim();
      const qtyNum = Number(item.qty);
      const priceNum = Number(item.price);
      if (!name) {
        notify("Each scanned item needs a name.", "warning");
        return;
      }
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        notify("Scanned item quantities must be positive numbers.", "warning");
        return;
      }
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        notify("Scanned item prices must be zero or greater.", "warning");
        return;
      }
      if (!item.participants.length) {
        notify("Select at least one participant for each scanned item.", "warning");
        return;
      }

      normalized.push({
        id: item.tempId,
        name,
        qty: qtyNum,
        price: priceNum,
        participants: item.participants,
      });
      newItemsSubtotal += qtyNum * priceNum;
    }

    let comparison = null;
    let appliedServiceChargePct = null;

    setBill((prev) => {
      const updatedItems = [...prev.items, ...normalized];
      const baseSubtotal = Number.isFinite(summaryForCommit.subtotal)
        ? summaryForCommit.subtotal
        : newItemsSubtotal;
      let serviceChargePct = prev.serviceCharge;

      if (Number.isFinite(summaryForCommit.serviceChargeAmount) && baseSubtotal > 0) {
        const derived = (summaryForCommit.serviceChargeAmount / baseSubtotal) * 100;
        if (Number.isFinite(derived) && derived >= 0) {
          serviceChargePct = Number(derived.toFixed(2));
          appliedServiceChargePct = serviceChargePct;
        }
      }

      const totals = computeTotalsForItems(updatedItems, {
        discount1: prev.discount1,
        serviceCharge: serviceChargePct,
        discount2: prev.discount2,
        gst: prev.gst,
      });

      comparison = { totals, summary: summaryForCommit };

      return {
        ...prev,
        items: updatedItems,
        serviceCharge: serviceChargePct,
      };
    });

    const currencyCode = summaryForCommit.currency || bill.currency || 'MVR';
    let successMessage = `Added ${normalized.length} scanned ${normalized.length === 1 ? "item" : "items"}.`;
    if (appliedServiceChargePct !== null) {
      successMessage += ` • Service charge set to ${appliedServiceChargePct.toFixed(2)}%`;
    }

    let warningMessage = null;
    const rawSummaryTotal = comparison?.summary?.total;
    let scannedTotal = null;
    if (typeof rawSummaryTotal === 'number' && Number.isFinite(rawSummaryTotal)) {
      scannedTotal = rawSummaryTotal;
    } else if (typeof rawSummaryTotal === 'string' && rawSummaryTotal.trim() !== '') {
      const parsed = Number(rawSummaryTotal.replace(/,/g, ''));
      if (Number.isFinite(parsed)) scannedTotal = parsed;
    }
    if (!hadExistingItems && scannedTotal !== null) {
      const diff = Math.abs(scannedTotal - comparison.totals.total);
      if (diff > 0.5) {
        warningMessage = `Receipt total (${formatMoney(scannedTotal, currencyCode)}) differs from the calculator total (${formatMoney(comparison.totals.total, currencyCode)}). Double-check discounts, taxes, or service charges.`;
      } else {
        successMessage += ` • Receipt total confirmed (${formatMoney(scannedTotal, currencyCode)})`;
      }
    }

    if (warningMessage) {
      notify(warningMessage, 'warning');
    } else {
      notify(successMessage, 'success');
    }

    discardScannedItems();
  };

  const [activeItemMenu, setActiveItemMenu] = useState(null); // { id, view } | null

  useEffect(() => {
    if (!activeItemMenu) return;
    const close = () => setActiveItemMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [activeItemMenu]);

  useEffect(() => {
    if (!session?.user) return;

    const meta = session.user.user_metadata || {};
    if (!profileSyncReady.current) {
      profileSyncReady.current = true;
      return;
    }

    const metaDisplay = meta.display_name ?? "";
    const metaAccount = (meta.account_number ?? "").slice(0, 13);

    if (metaDisplay === (userDisplayName || "") && metaAccount === (userAccount || "")) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            display_name: userDisplayName || null,
            account_number: userAccount || null,
          },
        });
        if (error) throw error;
      } catch (err) {
        console.error("Failed to persist profile", err);
        notify("Could not save profile", "error");
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    session?.user?.id,
    session?.user?.user_metadata?.display_name,
    session?.user?.user_metadata?.account_number,
    userDisplayName,
    userAccount,
  ]);
  const exportImage = async (type = "png", mode = "full") => {
    const target = mode === "summary" ? summaryRef.current : exportRef.current;
    if (!target) {
      notify("Nothing to export", "warning");
      return;
    }
    try {
      setIsExporting(true);
      notify("Generating image...", "info");
      
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(target, { 
        scale: 2, 
        backgroundColor: "#05080f",
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const mime = type === "jpeg" ? "image/jpeg" : "image/png";
      const data = canvas.toDataURL(mime, 0.95);
      const a = document.createElement("a");
      a.href = data; 
      const suffix = mode === "summary" ? "-summary" : "";
      a.download = `${bill.title || "bill"}${suffix}.${type === "jpeg" ? "jpg" : "png"}`; 
      a.click();
      
      notify(`Image exported successfully ✅`, "success");
    } catch (err) {
      console.error("Export image error:", err);
      notify("Failed to export image", "error");
    } finally { 
      setIsExporting(false); 
    }
  };

  // Share image via Web Share API if available (mobile-friendly)
  const shareBill = async () => {
    if (!exportRef.current) return exportImage("png", "full");
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 80));
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#05080f",
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL("image/png", 0.95);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${bill.title || "bill"}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: bill.title || "Bill Splitter", text: "Split bill breakdown" });
        notify("Shared successfully ✅", "success");
      } else {
        // Fallback to download
        const a = document.createElement("a");
        a.href = dataUrl; a.download = `${bill.title || "bill"}.png`; a.click();
        notify("Sharing not supported. Downloaded PNG instead.", "warning");
      }
    } catch (err) {
      console.error("Share error:", err);
      notify("Share failed", "error");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!downloadMenuOpen) return;
    const handler = (event) => {
      if (!downloadMenuRef.current) return;
      if (!downloadMenuRef.current.contains(event.target)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [downloadMenuOpen]);

  // Save to history (requires login)
  async function handleSaveToHistory() {
    try {
      if (!session?.user?.id) {
        notify("Please sign in to save this bill.", "warning");
        return;
      }
      const payload = { friends, bill };
      console.log("Saving bill with payload:", payload);
      console.log("Bill items:", bill.items);
      await saveBill({ title: bill.title || "Untitled bill", currency: bill.currency, payload });
      notify("Saved to history ✅", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to save bill", "error");
    }
  }

  // ---- JSON ----
  const exportJSON = () => {
    const exportData = {
      user: {
        name: userDisplayName,
        account: userAccount
      },
      friends: friends,
      bill: bill,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a");
    a.href = url; 
    a.download = `${bill.title || "bill"}.json`; 
    a.click(); 
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Bill exported successfully ✅", "success");
  };
  
  const importJSON = () => {
    const inp = document.createElement("input"); 
    inp.type = "file"; 
    inp.accept = "application/json";
    inp.onchange = () => { 
      const f = inp.files?.[0]; 
      if (!f) return; 
      const r = new FileReader();
      r.onload = (e) => { 
        try { 
          const obj = JSON.parse(e.target.result);
          if (!obj?.bill) throw new Error("Invalid file format");
          
          // Import bill data
          setBill(obj.bill);
          
          // Import user data if available
          if (obj.user) {
            setUserDisplayName(obj.user.name || userDisplayName);
            setUserAccount(obj.user.account || userAccount);
          }
          
          // Import friends: to Supabase if signed in, otherwise into local list for this bill
          if (obj.friends && session?.user?.id) {
            importFriendsToSupabase(obj.friends);
          } else if (obj.friends) {
            setFriends(
              Array.isArray(obj.friends)
                ? obj.friends.map((friend) => ({
                    ...friend,
                    phone: normalizePhone(friend.phone || ""),
                  }))
                : []
            );
            notify("Imported friends locally. Sign in to save to account.", "warning");
          }
          
          notify("Bill imported successfully ✅", "success");
        } catch (err) { 
          console.error("Import error:", err);
          notify("Invalid JSON file or import failed", "error"); 
        } 
      }; 
      r.readAsText(f); 
    };
    inp.click();
  };

  const importFriendsToSupabase = async (friendsToImport) => {
    try {
      for (const friend of friendsToImport) {
        const normalizedPhone = normalizePhone(friend.phone || "");
        const payload = {
          user_id: session.user.id,
          name: friend.name,
          account: (friend.account || "").slice(0, 13) || null,
        };
        if (normalizedPhone) payload.phone = normalizedPhone;

        const { error } = await supabase
          .from('friends')
          .insert(payload);
        
        if (error && !error.message.includes('duplicate')) {
          console.error('Failed to import friend:', friend.name, error);
        }
      }
      
      // Refresh friends list
      const { data, error } = await supabase
        .from('friends')
        .select('id, name, account, phone')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (!error) {
        const normalized = (data || []).map((row) => ({ ...row, phone: row.phone || "" }));
        setFriendCatalog(normalized);
      }
      notify("Friends imported successfully ✅", "success");
    } catch (err) {
      console.error('Failed to import friends:', err);
      notify("Failed to import some friends", "warning");
    }
  };

  // Participant color helper (consistent distinct colors for badges/totals)
  // Build per-list unique hues to avoid any close duplicates within participants
  const participantColorMap = useMemo(() => {
    const used = [];
    const prox = 12; // degrees minimum separation
    const step = 23;
    const map = {};
    const emerald = meColor; // fixed emerald for current user
    for (const p of allParticipants) {
      if (p.isCurrentUser) {
        map[p.name] = emerald;
        used.push(160);
        continue;
      }
      let h = hueFromName(p.name || '');
      for (let i = 0; i < 360; i++) {
        let ok = true;
        for (const uh of used) {
          const d = Math.min(Math.abs(uh - h), 360 - Math.abs(uh - h));
          if (d < prox) { ok = false; break; }
        }
        if (ok) { used.push(h); map[p.name] = colorFromHue(h); break; }
        h = (h + step) % 360;
      }
      if (!map[p.name]) map[p.name] = colorFromName(p.name);
    }
    return map;
  }, [allParticipants]);

  const participantColor = (name = '') => participantColorMap[name] || colorFromName(name);

  const [showProfile, setShowProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOverlayOpen, setCameraOverlayOpen] = useState(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const openScanFlow = () => {
    setCameraOverlayOpen(true);
  };
  const handleCameraCapture = async (dataUrl: string) => {
    if (!ocrReaderRef.current?.processDataUrl) return;
    setCameraProcessing(true);
    try {
      const success = await ocrReaderRef.current.processDataUrl(dataUrl, { origin: "camera" });
      if (success) {
        setCameraOverlayOpen(false);
      }
    } catch (err) {
      console.error("Camera capture failed", err);
    } finally {
      setCameraProcessing(false);
    }
  };
  const handleCameraUpload = () => {
    setCameraOverlayOpen(false);
    const runner = () => ocrReaderRef.current?.triggerUpload?.();
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(runner);
    } else {
      setTimeout(runner, 0);
    }
  };
  const handleCameraAddManual = () => {
    setCameraOverlayOpen(false);
    setShowItemModal(true);
  };

  useEffect(() => {
    const handler = () => setShowProfile(true);
    window.addEventListener("bs:open-profile", handler);
    return () => window.removeEventListener("bs:open-profile", handler);
  }, []);
  useEffect(() => {
    const handler = () => setCameraOverlayOpen(true);
    window.addEventListener("bs:open-ocr", handler);
    return () => window.removeEventListener("bs:open-ocr", handler);
  }, []);

  const payerParticipant = allParticipants.find((p) => p.name === bill.payer) || null;
  const payerAccount = payerParticipant?.account || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05080f] via-[#070c14] to-[#05080f] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header small */}
        <div className="text-center mb-3">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center justify-center gap-3">
            <Receipt className="text-green-400" /> Bill Splitter
          </h1>
          <p className="text-slate-400 text-sm">Add friends, add items, itemized breakdown, payer & export as image</p>
        </div>

        {/* Top controls */}
        <div className="mb-4">
          <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto lg:justify-end">
                <ActionButton
                  icon={<Plus size={18} />}
                  label="New"
                  onClick={() => {
                    setBill({
                      title: "",
                      date: "",
                      currency: "MVR",
                      discount1: 0,
                      serviceCharge: 10,
                      discount2: 0,
                      gst: 8,
                      payer: "",
                      items: [],
                    });
                    notify("New bill started");
                  }}
                />
                <ActionButton
                  icon={<ScanText size={18} />}
                  label="Scan receipt"
                  tone="cyan"
                  onClick={openScanFlow}
                />
                <ActionButton
                  icon={<SaveIcon size={18} />}
                  label="Save bill"
                  onClick={handleSaveToHistory}
                  tone="emerald"
                />
                <DownloadButton
                  onSelect={(mode) => {
                    exportImage("png", mode);
                  }}
                  open={downloadMenuOpen}
                  setOpen={setDownloadMenuOpen}
                  ref={downloadMenuRef}
                />
                <ActionButton
                  icon={<Share2 size={18} />}
                  label="Share"
                  onClick={shareBill}
                  tone="indigo"
                />
              </div>
            </div>
          </div>
        </div>

          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] lg:items-start lg:gap-4">
            <div className="space-y-4">
            {/* Participants */}
            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
                  <Users size={16} className="text-emerald-300" />
                  <span>Participants</span>
                </div>
                <div className="flex flex-1 items-center justify-end gap-2 min-w-[240px]">
                  {session?.user?.id && (
                    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                      <input
                        placeholder="Search saved friends"
                        value={friendSearch}
                        onChange={(e) => setFriendSearch(e.target.value)}
                        aria-label="Search saved friends"
                        className="w-full rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                      />
                      {friendSearch.trim() && (() => {
                        const searchTerm = friendSearch.trim().toLowerCase();
                        const digitTerm = searchTerm.replace(/\D/g, "");
                        const matches = friendCatalog.filter((f) => {
                          if (!searchTerm) return true;
                          const nameMatch = f.name.toLowerCase().includes(searchTerm);
                          const accountMatch = (f.account || "").toLowerCase().includes(searchTerm);
                          const phoneMatch = (f.phone || "").toLowerCase().includes(searchTerm);
                          const digitsMatch = digitTerm && (f.phone || "").replace(/\D/g, "").includes(digitTerm);
                          return nameMatch || accountMatch || phoneMatch || digitsMatch;
                        });
                        const visibleMatches = matches
                          .filter((f) => !friends.some((p) => {
                            if (p.id === f.id) return true;
                            const existingPhone = normalizePhone(p.phone || "");
                            const nextPhone = normalizePhone(f.phone || "");
                            return existingPhone && nextPhone && existingPhone === nextPhone;
                          }))
                          .slice(0, 8);
                        return (
                          <div className="absolute right-0 z-20 mt-2 max-h-56 w-[min(24rem,100vw)] overflow-auto rounded-xl border border-slate-700/70 bg-slate-950/95 p-2 text-sm shadow">
                            {visibleMatches.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  if (friends.some((p) => normalizePhone(p.phone || "") === normalizePhone(f.phone || ""))) {
                                    notify("This mobile number is already on the participant list", "warning");
                                    return;
                                  }
                                  setFriends((prev) => [...prev, f]);
                                  setFriendSearch("");
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-slate-800/70"
                              >
                                {f.name}
                                {f.phone ? ` · ${f.phone}` : ""}
                                {f.account ? ` · ${f.account}` : ""}
                              </button>
                            ))}
                            {visibleMatches.length === 0 && (
                              <div className="px-3 py-2 text-slate-400">No matches</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAddFriend((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-950/80 px-2 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 sm:px-3 sm:text-sm"
                  >
                    <Plus size={14} />
                    <span className="sr-only sm:hidden">{showAddFriend ? "Cancel" : "Add friend"}</span>
                    <span className="hidden sm:inline">{showAddFriend ? "Cancel" : "Add friend"}</span>
                  </button>
                </div>
              </div>

              {session?.user?.id && circles.length > 0 && (
                <div className="mb-3 grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="text-xs uppercase tracking-wide text-emerald-200/80">Friend circle</label>
                    <select
                      value={selectedCircle}
                      onChange={(e) => setSelectedCircle(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                    >
                      <option value="">Select circle…</option>
                      {circles.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({circleCounts[c.id] ?? 0})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {showAddFriend && (
                <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 sm:grid-cols-3">
                  <input
                    placeholder="Friend name"
                    value={newFriend.name}
                    onChange={(e) => setNewFriend((v) => ({ ...v, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                  <input
                    placeholder="Mobile (+15551234567)"
                    inputMode="tel"
                    value={newFriend.phone}
                    onChange={(e) => {
                      const next = normalizePhone(e.target.value);
                      setNewFriend((v) => ({ ...v, phone: next }));
                    }}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                  <input
                    placeholder="Account (optional)"
                    value={newFriend.account}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, 13);
                      setNewFriend((v) => ({ ...v, account: next }));
                    }}
                    maxLength={13}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                  <button
                    onClick={addFriend}
                    className="sm:col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
                  >
                    <SaveIcon size={14} /> Save friend
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {allParticipants.map((p) => {
                  if (p.isCurrentUser) {
                    return (
                      <span
                        key={p.id ?? p.name}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium bg-emerald-900/40 border-emerald-500/40 text-emerald-200"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                        <span className="truncate max-w-[120px]">{p.name} (You)</span>
                      </span>
                    );
                  }
                  const col = participantColor(p.name);
                  return (
                    <span
                      key={p.id ?? p.name}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: col.bg, borderColor: col.border, color: col.text }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.dot }}></span>
                      <span className="truncate max-w-[120px]">{p.name}</span>
                      <button
                        onClick={() => removeFriend(p.id, p.name)}
                        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-red-500/30 hover:text-white"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
                {!allParticipants.length && (
                  <div className="rounded-full border border-slate-700/70 bg-slate-950/70 px-4 py-1.5 text-sm text-slate-300">
                    No participants yet. Add your friends above.
                  </div>
                )}
              </div>
            </div>


            {/* Table Section */}
            <div className="space-y-3">
              <div ref={exportRef} className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
              {/* Title & date inline */}
              <div className="mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => titleInputRef.current?.focus()}
                      aria-label="Edit title"
                      title="Edit title"
                      className="inline-flex items-center justify-center rounded-lg p-2 sm:p-1 text-emerald-300 transition hover:bg-emerald-500/10"
                    >
                      <Pencil size={18} />
                    </button>
                    <input
                      ref={titleInputRef}
                      value={bill.title}
                      onChange={(e) => setBill((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Untitled bill"
                      className="flex-1 bg-transparent text-lg font-semibold text-white placeholder-slate-400 focus:outline-none border-b border-transparent focus:border-emerald-400/60 pb-0.5 transition"
                    />
                  </div>
                  <div className="relative">
                    <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" />
                    <input
                      type="date"
                      aria-label="Bill date"
                      value={bill.date || ""}
                      onChange={(e) => setBill((s) => ({ ...s, date: e.target.value }))}
                      className="rounded-xl border border-slate-700/70 bg-slate-900/70 py-2 pl-10 pr-3 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-[11px] uppercase tracking-wide text-emerald-200/80">
                      Payer
                    </span>
                    <div className="relative min-w-[180px]">
                      <CreditCard
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300"
                      />
                      <select
                        value={bill.payer}
                        onChange={(e) => setBill((s) => ({ ...s, payer: e.target.value }))}
                        className="w-full appearance-none rounded-xl border border-slate-700/70 bg-slate-950/80 py-2 pl-10 pr-8 text-left text-sm font-medium text-slate-100 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="">Select payer</option>
                        {allParticipants.map((p) => (
                          <option key={`pay-${p.name}`} value={p.name}>
                            {p.name}
                            {p.isCurrentUser ? " (You)" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 sm:flex-1">
                    <span className="text-[11px] uppercase tracking-wide text-emerald-200/80">
                      Account
                    </span>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:flex-1">
                      <span className="font-semibold text-white break-all">
                        {payerAccount || "—"}
                      </span>
                      {payerAccount && (
                        <button
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(payerAccount);
                              notify("Account copied ✅");
                            } else {
                              notify("Clipboard not supported", "warning");
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600/70 text-emerald-200 transition hover:bg-emerald-500/20"
                          aria-label="Copy payer account"
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-white">Itemized Split</h2>
              <OcrReader
                ref={ocrReaderRef}
                onParse={handleOcrItems}
                onError={handleOcrError}
                onStart={() => setShowItemModal(false)}
                compact
              />

              {/* Mobile list view */}
              <div className="sm:hidden space-y-2">
                {bill.items.length === 0 && (
                  <div className="text-slate-400 text-sm">No items yet.</div>
                )}
                {bill.items.map((it, idx) => {
                  const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
                  const participants = allParticipants.filter(p => (it.participants || []).includes(p.name));
                  const menuOpen = activeItemMenu?.id === it.id && activeItemMenu?.view === 'mobile';
                  return (
                    <div key={`m-${it.id}`} className="relative mx-1 rounded-2xl border border-slate-700/60 bg-slate-950/70 p-3 pb-6 backdrop-blur">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveItemMenu(menuOpen ? null : { id: it.id, view: 'mobile' });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/60"
                        aria-label="Item actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen && (
                        <div
                          className="absolute right-2 -top-2 z-30 w-36 -translate-y-full transform rounded-xl border border-slate-700/70 bg-slate-900/95 p-2 text-sm text-slate-100 shadow"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-blue-200 hover:bg-blue-500/10"
                            onClick={() => {
                              setActiveItemMenu(null);
                              openEditItem(it);
                            }}
                          >
                            Edit item
                          </button>
                          <button
                            type="button"
                            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-red-200 hover:bg-red-500/10"
                            onClick={() => {
                              setActiveItemMenu(null);
                              deleteItem(it.id);
                            }}
                          >
                            Delete item
                          </button>
                        </div>
                      )}
                      <div className="pointer-events-none absolute bottom-2 right-3 text-xs font-medium text-slate-300">
                        Row total: {fmt(rowTotal)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-medium">{idx + 1}. {it.name || '—'}</div>
                          <div className="text-xs text-slate-400">Qty: {it.qty || 0}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {participants.length ? participants.map(p => {
                          const color = participantColor(p.name);
                          return (
                            <span
                              key={`mp-${it.id}-${p.name}`}
                              className={`px-2 py-1 rounded-full text-xs ${color.border} ${color.bg} ${color.text}`}
                            >
                              {p.name}
                              {p.isCurrentUser ? " (You)" : ""}: {fmt(
                                (Number(it.qty || 0) * Number(it.price || 0)) /
                                  Math.max((it.participants || []).length, 1)
                              )}
                            </span>
                          );
                        }) : <span className="text-slate-400 text-xs">No participants</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet compact list (sm to <lg) */}
              <div className="hidden sm:block lg:hidden space-y-2">
                {bill.items.length === 0 && (
                  <div className="text-slate-400 text-sm">No items yet.</div>
                )}
                {bill.items.map((it, idx) => {
                  const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
                  const participants = allParticipants.filter(p => (it.participants || []).includes(p.name));
                  const perShare = (Number(it.qty||0)*Number(it.price||0)) / Math.max((it.participants||[]).length,1);
                  const menuOpen = activeItemMenu?.id === it.id && activeItemMenu?.view === 'tablet';
                  return (
                    <div key={`t-${it.id}`} className="relative rounded-2xl border border-slate-700/60 bg-slate-950/70 p-3 pb-6 backdrop-blur">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveItemMenu(menuOpen ? null : { id: it.id, view: 'tablet' });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/60"
                        aria-label="Item actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen && (
                        <div
                          className="absolute right-2 -top-2 z-30 w-36 -translate-y-full transform rounded-xl border border-slate-700/70 bg-slate-900/95 p-2 text-sm text-slate-100 shadow"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-blue-200 hover:bg-blue-500/10"
                            onClick={() => {
                              setActiveItemMenu(null);
                              openEditItem(it);
                            }}
                          >
                            Edit item
                          </button>
                          <button
                            type="button"
                            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-red-200 hover:bg-red-500/10"
                            onClick={() => {
                              setActiveItemMenu(null);
                              deleteItem(it.id);
                            }}
                          >
                            Delete item
                          </button>
                        </div>
                      )}
                      <div className="pointer-events-none absolute bottom-2 right-3 text-xs font-medium text-slate-300">
                        Row total: {fmt(rowTotal)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{idx + 1}. {it.name || '—'}</div>
                          <div className="text-xs text-slate-400">Qty: {it.qty || 0}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {participants.length ? participants.map(p => {
                          const color = participantColor(p.name);
                          return (
                            <span
                              key={`tp-${it.id}-${p.name}`}
                              className={`rounded-full border px-2 py-1 text-xs ${color.border} ${color.bg} ${color.text}`}
                            >
                              {p.name}
                              {p.isCurrentUser ? " (You)" : ""}: {fmt(perShare)}
                            </span>
                          );
                        }) : <span className="text-slate-400 text-xs">No participants</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop/tablet table */}
              <div className="hidden lg:block overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="text-white">
                    <tr className="bg-slate-950/70">
                      <th className={`text-left p-2`}>#</th>
                      <th className={`text-left p-2`}>Item</th>
                      <th className={`text-right p-2`}>Qty</th>
                      {allParticipants.map((p) => {
                        const color = participantColor(p.name);
                        return (
                          <th
                            key={`h-${p.name}`}
                            className={`text-right font-semibold p-2 whitespace-nowrap min-w-[80px] ${color.text}`}
                          >
                            {p.name.length > 8 ? `${p.name.substring(0, 8)}...` : p.name} {p.isCurrentUser ? "(You)" : ""}
                          </th>
                        );
                      })}
                      <th className={`text-right p-2`}>Row Total</th>
                      {!isExporting && <th className={`p-2 text-center`}>Actions</th>}
                    </tr>
                  </thead>

                  <tbody className="text-slate-100">
                    {bill.items.map((it, idx) => {
                      const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
                      return (
                        <tr key={it.id} className={idx % 2 ? "bg-slate-800/60" : "bg-slate-900/50"}>
                          <td className={`p-2 text-right`}>{idx + 1}</td>
                          <td className={`p-2`}>{it.name || <span className="text-slate-500">—</span>}</td>
                          <td className={`p-2 text-right`}>{it.qty || 0}</td>
                          {allParticipants.map((p) => {
                            const color = participantColor(p.name);
                            return (
                          <td key={`cell-${it.id}-${p.name}`} className="p-2 text-right" style={{ color: participantColor(p.name).text }}>
                            {fmt(cellShare(it, p.name))}
                          </td>
                            );
                          })}
                      <td className={`p-2 text-right font-semibold`}>{fmt(rowTotal)}</td>
                      {!isExporting && (
                        <td className={`p-2`}>
                          <div className="relative flex justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const menuOpen = activeItemMenu?.id === it.id && activeItemMenu?.view === 'desktop';
                                setActiveItemMenu(menuOpen ? null : { id: it.id, view: 'desktop' });
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/60"
                              aria-label="Item actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeItemMenu?.id === it.id && activeItemMenu?.view === 'desktop' && (
                              <div
                                className="absolute right-0 -top-2 z-30 w-36 -translate-y-full transform rounded-xl border border-slate-700/70 bg-slate-900/95 p-2 text-sm text-slate-100 shadow"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                className="block w-full rounded-lg px-3 py-2 text-left text-blue-200 hover:bg-blue-500/10"
                                onClick={() => {
                                  setActiveItemMenu(null);
                                  openEditItem(it);
                                }}
                              >
                                Edit item
                              </button>
                                <button
                                  type="button"
                                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-red-200 hover:bg-red-500/10"
                                  onClick={() => {
                                    setActiveItemMenu(null);
                                    deleteItem(it.id);
                                  }}
                                >
                                  Delete item
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                        </tr>
                      );
                    })}
                    {!bill.items.length && (
                      <tr><td colSpan={friends.length + (isExporting ? 5 : 6)} className="p-4 text-center text-slate-400">Add items to see the breakdown.</td></tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-950/80 text-white">
                      <td className="p-2 font-semibold" colSpan={3}>SUM</td>
                      {allParticipants.map((p) => (
                        <td key={`sum-${p.name}`} className="p-2 text-right" style={{ color: participantColor(p.name).text }}>
                          {fmt(calc.perParticipantSubtotal[p.name] || 0)}
                        </td>
                      ))}
                      <td className="p-2 text-right">{fmt(calc.grandSubtotal)}</td>
                      {!isExporting && <td></td>}
                    </tr>

                    {calc.rows.map((r, i) => (
                      <tr key={`stage-${i}`} className="bg-slate-950/60 text-white">
                        <td className="p-2" colSpan={3}>{r.label}</td>
                        {allParticipants.map((p) => {
                          const color = participantColor(p.name);
                          return (
                            <td key={`stage-${i}-${p.name}`} className={`p-2 text-right ${color.text}`}>
                              {fmt(Math.abs(r.delta[p.name] || 0))}
                            </td>
                          );
                        })}
                        <td className="p-2 text-right">{fmt(Math.abs(r.totalDelta))}</td>
                        {!isExporting && <td></td>}
                      </tr>
                    ))}

                    <tr className="bg-green-950">
                      <td className="p-2 font-bold text-green-300" colSpan={3}>PAYABLE</td>
                      {allParticipants.map(p => (
                        <td key={`pay-${p.name}`} className="p-2 text-right font-bold text-green-400">
                          {currencyPrefix}{fmt(calc.perParticipantPayable[p.name] || 0)}
                        </td>
                      ))}
                      <td className="p-2 text-right font-bold text-green-400">{currencyPrefix}{fmt(calc.grandPayable)}</td>
                      {!isExporting && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
              
            </div>
            </div>

            <div className="mt-4 space-y-4 lg:mt-0">
              <div ref={summaryRef} className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Totals</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {summaryLines.map((line, idx) => {
                    const prettyLabel = line.label.replace('S/C', 'Service Charge');
                    const formattedValue =
                      line.kind === 'delta'
                        ? `${line.value < 0 ? '-' : '+'}${currencyPrefix}${fmt(Math.abs(line.value))}`
                        : `${currencyPrefix}${fmt(line.value)}`;
                    return (
                      <div key={`total-summary-${idx}`} className="flex items-center justify-between">
                        <span className={line.kind === 'total' ? 'text-white font-semibold' : 'text-slate-300'}>
                          {prettyLabel}
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
                <div className="mt-4 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-emerald-200/70">Per person</div>
                  {allParticipants.map((p) => {
                    if (p.isCurrentUser) {
                      return (
                        <div key={`summary-${p.name}`} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold bg-emerald-900/40 border-emerald-500/40`}>
                          <span className={`inline-flex items-center gap-2 text-emerald-200`}>
                            <span className={`h-2.5 w-2.5 rounded-full bg-emerald-400`}></span>
                            {p.name} (You)
                          </span>
                          <span className={`text-emerald-200`}>
                            {currencyPrefix}
                            {fmt(calc.perParticipantPayable[p.name] || 0)}
                          </span>
                        </div>
                      );
                    }
                    const col = participantColor(p.name);
                    return (
                      <div key={`summary-${p.name}`} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold`} style={{ backgroundColor: col.bg, borderColor: col.border }}>
                        <span className={`inline-flex items-center gap-2`} style={{ color: col.text }}>
                          <span className={`h-2.5 w-2.5 rounded-full`} style={{ backgroundColor: col.dot }}></span>
                          {p.name}
                        </span>
                        <span style={{ color: col.text }}>
                          {currencyPrefix}
                          {fmt(calc.perParticipantPayable[p.name] || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
                    <Calculator size={16} className="text-green-400" />
                    <span>Settings</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((v) => !v)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/60"
                    aria-label={settingsOpen ? 'Collapse settings' : 'Expand settings'}
                  >
                    <ChevronDown size={16} className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">Fine tune charges & taxes.</p>
                {settingsOpen && (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-200/80">
                        <span>Currency</span>
                        <Receipt size={14} className="text-emerald-300" />
                      </div>
                      <div className="relative mt-2">
                        <select
                          value={bill.currency}
                          onChange={(e) => setBill((s) => ({ ...s, currency: e.target.value }))}
                          className="w-full appearance-none rounded-xl border border-emerald-600/40 bg-emerald-900/40 py-2 pl-3 pr-8 text-sm font-medium text-emerald-100 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          {Object.keys(currencySymbols).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/80"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <SettingInput
                        label="GST"
                        value={bill.gst}
                        onChange={(value) => setBill((s) => ({ ...s, gst: value }))}
                      />
                      <SettingInput
                        label="Service Charge"
                        value={bill.serviceCharge}
                        onChange={(value) => setBill((s) => ({ ...s, serviceCharge: value }))}
                      />
                      <SettingInput
                        label="Discount 1"
                        value={bill.discount1}
                        onChange={(value) => setBill((s) => ({ ...s, discount1: value }))}
                      />
                      <SettingInput
                        label="Discount 2"
                        value={bill.discount2}
                        onChange={(value) => setBill((s) => ({ ...s, discount2: value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* OCR Review modal */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700/70 bg-slate-900/85 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-lg font-semibold">Review scanned items</h3>
                <p className="text-sm text-slate-300/80">Adjust details and pick participants before adding them to the bill.</p>
              </div>
              <button
                type="button"
                onClick={discardScannedItems}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/70"
                aria-label="Close scanned items"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {scannedItems.map((item, idx) => (
                <div key={item.tempId} className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr),auto,auto]">
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Item name</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateScannedItem(idx, { name: e.target.value })}
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateScannedItem(idx, { qty: e.target.value })}
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Price ({bill.currency})</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateScannedItem(idx, { price: e.target.value })}
                        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Participants</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allParticipants.map((p) => {
                        const active = item.participants.includes(p.name);
                        const colors = participantColor(p.name);
                        return (
                          <button
                            key={`${item.tempId}-${p.name}`}
                            type="button"
                            onClick={() => toggleScannedParticipant(idx, p.name)}
                            className={`rounded-full border px-3 py-1 text-sm transition ${active ? '' : 'bg-slate-800/80 text-slate-200 border-slate-700/70 hover:bg-slate-700/80'}`}
                            style={active ? { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text } : undefined}
                          >
                            {p.name}
                            {p.isCurrentUser ? ' (You)' : ''}
                          </button>
                        );
                      })}
                      {!allParticipants.length && (
                        <span className="text-xs text-slate-500">Add participants in the section above first.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {scannedText && import.meta.env.DEV && (
                <details className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 text-xs text-slate-300">
                  <summary className="cursor-pointer text-emerald-200">Raw OCR output</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-slate-300">{scannedText}</pre>
                </details>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={discardScannedItems}
                className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={commitScannedItems}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
              >
                <SaveIcon size={14} /> Add to bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h3 className="text-white text-lg font-semibold">{editingId ? "Edit Item" : "Add Item"}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => ocrReaderRef.current?.open?.()}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-600/30"
                >
                  <Upload size={14} /> Upload bill
                </button>
                <button onClick={() => setShowItemModal(false)} className="text-slate-300 transition hover:text-white"><X /></button>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm text-slate-300">Item name</label>
                  <input
                    value={itemForm.name}
                    onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveItemForm(); } }}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                    placeholder="e.g., Butter Chicken"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Quantity</label>
                  <input
                    type="number" min={1} value={itemForm.qty}
                    onChange={e => setItemForm(f => ({ ...f, qty: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveItemForm(); } }}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Price ({bill.currency})</label>
                  <input
                    type="number" step="0.01" min={0} inputMode="decimal" value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveItemForm(); } }}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm text-slate-300">Share with (select participants)</label>
                  <div className="flex flex-wrap gap-2">
                    {allParticipants.length ? allParticipants.map(p => {
                      const on = itemForm.participants.includes(p.name);
                      const color = participantColor(p.name);
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => toggleFormParticipant(p.name)}
                          className={`px-3 py-1 rounded-full text-sm border ${on ? '' : "bg-slate-800 text-slate-200 border-slate-700"} ${p.isCurrentUser && on ? "ring-2 ring-emerald-400" : ""}`}
                          style={on ? { backgroundColor: participantColor(p.name).bg, borderColor: participantColor(p.name).border, color: participantColor(p.name).text } : undefined}
                        >
                          {p.name} {p.isCurrentUser ? '(You)' : ''}
                        </button>
                      );
                    }) : <div className="text-slate-400 text-sm">No participants available.</div>}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveItemForm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
                >
                  {editingId ? <Pencil size={14} /> : <Plus size={14} />}
                  {editingId ? "Update Item" : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-lg font-semibold">Your Profile</h3>
              <button onClick={() => setShowProfile(false)} className="text-slate-300 transition hover:text-white"><X /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Display Name</label>
                <input value={userDisplayName} onChange={(e)=>setUserDisplayName(e.target.value)} className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Account Number</label>
                <input
                  value={userAccount}
                  onChange={(e)=>setUserAccount(e.target.value.slice(0,13))}
                  maxLength={13}
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input value={session?.user?.email || ''} disabled className="w-full rounded-xl border border-slate-700/70 bg-slate-900/50 px-3 py-2 text-slate-300 opacity-80" />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowProfile(false)} className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70">Close</button>
            </div>
          </div>
        </div>
      )}

      {cameraOverlayOpen && (
        <CameraOverlay
          processing={cameraProcessing}
          onClose={() => {
            setCameraOverlayOpen(false);
            setCameraProcessing(false);
          }}
          onCapture={handleCameraCapture}
          onUpload={handleCameraUpload}
          onAddManual={handleCameraAddManual}
        />
      )}

      {/* Floating Add Item button (mobile) */}
      <button
        onClick={openAddItem}
        className="sm:hidden fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 shadow-xl backdrop-blur-xl transition hover:bg-emerald-500/30"
        aria-label="Add Item"
      >
        <Plus />
      </button>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[60] rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm
                         ${toast.kind === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100' : ''}
                         ${toast.kind === 'warning' ? 'bg-amber-900/90 border-amber-700 text-amber-100' : ''}
                         ${toast.kind === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' : ''}
                         ${toast.kind === 'info' ? 'bg-blue-900/90 border-blue-700 text-blue-100' : ''}`}
        >
          <div className="flex items-center gap-2">
            {toast.kind === 'success' && <CheckCircle2 size={18} className="opacity-90" />}
            {toast.kind === 'warning' && <AlertTriangle size={18} className="opacity-90" />}
            {toast.kind === 'error' && <XCircle size={18} className="opacity-90" />}
            {toast.kind === 'info' && <Receipt size={18} className="opacity-90" />}
            <span className="text-sm font-medium">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-80 hover:opacity-100 underline">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
