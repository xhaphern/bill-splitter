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
  HardDrive,
} from "lucide-react";
import html2canvas from "html2canvas";
import { saveBill } from "./api/supaBills";
import { supabase } from "./supabaseClient";

const STORAGE_FRIENDS = "bs_friends_v1";
const STORAGE_BILL   = "bs_bill_v1";
const currencySymbols = { MVR: "MVR ", USD: "$", EUR: "€", GBP: "£", INR: "₹", SGD: "S$", AUD: "A$", CAD: "C$", JPY: "¥" };
const fmt = (n) => (Number(n) || 0).toFixed(2);

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
  // ---- Friends (from Supabase) ----
  const [friends, setFriends] = useState([]);
  
  // Load friends from Supabase
  useEffect(() => {
    if (!session?.user?.id) {
      setFriends([]);
      return;
    }

    const loadFriends = async () => {
      try {
        const { data, error } = await supabase
          .from('friends')
          .select('id, name, account')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setFriends(data || []);
      } catch (err) {
        console.error('Failed to load friends:', err);
        setFriends([]);
      }
    };

    loadFriends();
  }, [session?.user?.id]);

  // Get current user's name and account from stored preferences
  const [userDisplayName, setUserDisplayName] = useState(() => {
    try { return localStorage.getItem('user_display_name') || session?.user?.email?.split('@')[0] || 'You'; } 
    catch { return session?.user?.email?.split('@')[0] || 'You'; }
  });
  
  const [userAccount, setUserAccount] = useState(() => {
    try { return (localStorage.getItem('user_account') || '').slice(0, 13); } 
    catch { return ''; }
  });
  
  // Update localStorage when userDisplayName or userAccount changes
  useEffect(() => {
    localStorage.setItem('user_display_name', userDisplayName);
  }, [userDisplayName]);
  
  useEffect(() => {
    localStorage.setItem('user_account', userAccount);
  }, [userAccount]);

  const currentUserName = userDisplayName;

  const profileSyncReady = useRef(false);

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
  const [newFriend, setNewFriend] = useState({ name: "", account: "" });
  const [showAddFriend, setShowAddFriend] = useState(false);

  const addFriend = async () => {
    const name = newFriend.name.trim();
    if (!name) return notify("Friend name is required", "warning");
    if (!session?.user?.id) return notify("Please sign in to add friends", "warning");
    
    try {
      const { error } = await supabase
        .from('friends')
        .insert({ 
          user_id: session.user.id, 
          name: name, 
          account: newFriend.account.trim().slice(0, 13) || null 
        });

      if (error) throw error;
      
    setNewFriend({ name: "", account: "" });
      setShowAddFriend(false);
      notify("Friend added successfully ✅", "success");
      
      // Refresh friends list
      const { data, error: fetchError } = await supabase
        .from('friends')
        .select('id, name, account')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (!fetchError) setFriends(data || []);
    } catch (err) {
      console.error('Failed to add friend:', err);
      notify("Failed to add friend", "error");
    }
  };

  const removeFriend = async (friendId, friendName) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;
      
      notify("Friend removed successfully ✅", "success");
      
      // Remove from bill items
    setBill(s => ({
      ...s,
        items: s.items.map(it => ({ ...it, participants: (it.participants || []).filter(p => p !== friendName) })),
        payer: s.payer === friendName ? "" : s.payer
      }));
      
      // Refresh friends list
      const { data, error: fetchError } = await supabase
        .from('friends')
        .select('id, name, account')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (!fetchError) setFriends(data || []);
    } catch (err) {
      console.error('Failed to remove friend:', err);
      notify("Failed to remove friend", "error");
    }
  };

  // ---- Bill state (persisted) ----
  const [bill, setBill] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_BILL));
      const defaults = {
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
      return stored ? { ...defaults, ...stored } : defaults;
    } catch {
      return {
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
    }
  });
  useEffect(() => { localStorage.setItem(STORAGE_BILL, JSON.stringify(bill)); }, [bill]);

  const currencyPrefix = currencySymbols[bill.currency] ?? "";
  const dense = allParticipants.length > 7; // auto-compact when many columns

  // ---- Item modal ----
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", qty: "1", price: "", participants: [] });

  const openAddItem = () => {
    setEditingId(null);
    setItemForm({ name: "", qty: "1", price: "", participants: [currentUserName] }); // Auto-select current user
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

  // ---- Toast (nice popup) ----
  const [toast, setToast] = useState(null); // { msg, kind: 'success'|'warning'|'error' }
  function notify(msg, kind = 'success') {
    setToast({ msg, kind });
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 2600);
  }

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
          
          // Import friends to Supabase if user is signed in
          if (obj.friends && session?.user?.id) {
            importFriendsToSupabase(obj.friends);
          } else if (obj.friends) {
            notify("Sign in to import friends to your account", "warning");
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
        const { error } = await supabase
          .from('friends')
          .insert({ 
            user_id: session.user.id, 
            name: friend.name, 
            account: (friend.account || "").slice(0, 13) || null 
          });
        
        if (error && !error.message.includes('duplicate')) {
          console.error('Failed to import friend:', friend.name, error);
        }
      }
      
      // Refresh friends list
      const { data, error } = await supabase
        .from('friends')
        .select('id, name, account')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (!error) setFriends(data || []);
      notify("Friends imported successfully ✅", "success");
    } catch (err) {
      console.error('Failed to import friends:', err);
      notify("Failed to import some friends", "warning");
    }
  };

  // Participant color helper (consistent distinct colors for badges/totals)
  const participantColor = (name) => {
    const palette = [
      {
        text: "text-sky-200",
        bg: "bg-sky-900/40",
        border: "border border-sky-500/40",
        ring: "ring-sky-400/40",
        dot: "bg-sky-400",
      },
      {
        text: "text-amber-200",
        bg: "bg-amber-900/30",
        border: "border border-amber-500/40",
        ring: "ring-amber-400/40",
        dot: "bg-amber-400",
      },
      {
        text: "text-fuchsia-200",
        bg: "bg-fuchsia-900/30",
        border: "border border-fuchsia-500/40",
        ring: "ring-fuchsia-400/40",
        dot: "bg-fuchsia-400",
      },
      {
        text: "text-teal-200",
        bg: "bg-teal-900/30",
        border: "border border-teal-500/40",
        ring: "ring-teal-400/40",
        dot: "bg-teal-400",
      },
      {
        text: "text-indigo-200",
        bg: "bg-indigo-900/30",
        border: "border border-indigo-500/40",
        ring: "ring-indigo-400/40",
        dot: "bg-indigo-400",
      },
      {
        text: "text-rose-200",
        bg: "bg-rose-900/30",
        border: "border border-rose-500/40",
        ring: "ring-rose-400/40",
        dot: "bg-rose-400",
      },
      {
        text: "text-lime-200",
        bg: "bg-lime-900/30",
        border: "border border-lime-500/40",
        ring: "ring-lime-400/40",
        dot: "bg-lime-400",
      },
    ];

    if (name === currentUserName) {
      return {
        text: "text-emerald-200",
        bg: "bg-emerald-900/40",
        border: "border border-emerald-500/40",
        ring: "ring-emerald-400/40",
        dot: "bg-emerald-400",
      };
    }

    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  };

  const [showProfile, setShowProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setShowProfile(true);
    window.addEventListener("bs:open-profile", handler);
    return () => window.removeEventListener("bs:open-profile", handler);
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-xl">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
                  <FileText size={16} />
                  <span>Bill title</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3">
                  <Pencil size={18} className="text-emerald-300" />
                  <input
                    value={bill.title}
                    onChange={(e) => setBill((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Weekend dinner with friends"
                    className="flex-1 bg-transparent text-base text-white placeholder-slate-400 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={bill.date || ""}
                    onChange={(e) => setBill((s) => ({ ...s, date: e.target.value }))}
                    className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
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
                  icon={<HardDrive size={18} />}
                  label="Save"
                  onClick={handleSaveToHistory}
                  tone="emerald"
                />
                <DownloadButton
                  onSelect={(mode) => {
                    exportImage('png', mode);
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
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
                  <Users size={16} className="text-emerald-300" />
                  <span>Participants</span>
                </div>
                <button
                  onClick={() => setShowAddFriend((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-950/80 px-2 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 sm:px-3 sm:text-sm"
                >
                  <Plus size={14} />
                  <span className="sr-only sm:hidden">{showAddFriend ? "Cancel" : "Add friend"}</span>
                  <span className="hidden sm:inline">{showAddFriend ? "Cancel" : "Add friend"}</span>
                </button>
              </div>

              {showAddFriend && (
                <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 sm:grid-cols-2">
                  <input
                    placeholder="Friend name"
                    value={newFriend.name}
                    onChange={(e) => setNewFriend((v) => ({ ...v, name: e.target.value }))}
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
                    className="sm:col-span-2 inline-flex items-center justify-center rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
                  >
                    Save friend
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {allParticipants.map((p) => {
                  const color = participantColor(p.name);
                  return (
                    <span
                      key={p.id ?? p.name}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${color.bg} ${color.border}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`}></span>
                      <span className={`truncate max-w-[120px] ${color.text}`}>
                        {p.name}
                        {p.isCurrentUser ? " (You)" : ""}
                      </span>
                      {!p.isCurrentUser && (
                        <button
                          onClick={() => removeFriend(p.id, p.name)}
                          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-red-500/30 hover:text-white"
                          aria-label={`Remove ${p.name}`}
                        >
                          <X size={12} />
                        </button>
                      )}
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
              {/* Title compact */}
              <div className="mb-3">
                <div className="text-white font-semibold text-lg mb-1" title={bill.title || "Untitled bill"}>
                  {bill.title || "Untitled bill"}
                </div>
                {bill.date && (
                  <div className="text-xs text-slate-400">Bill date: {new Date(bill.date).toLocaleDateString()}</div>
                )}
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

              <h2 className="text-lg font-semibold mb-3 text-white">Itemized Split</h2>

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
                              <td
                                key={`cell-${it.id}-${p.name}`}
                                className={`p-2 text-right ${color.text}`}
                              >
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
                      {allParticipants.map((p) => {
                        const color = participantColor(p.name);
                        return (
                          <td key={`sum-${p.name}`} className={`p-2 text-right ${color.text}`}>
                            {fmt(calc.perParticipantSubtotal[p.name] || 0)}
                          </td>
                        );
                      })}
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
                    const color = participantColor(p.name);
                    return (
                      <div
                        key={`summary-${p.name}`}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${color.bg} ${color.border}`}
                      >
                        <span className={`inline-flex items-center gap-2 ${color.text}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`}></span>
                          {p.name}
                          {p.isCurrentUser ? " (You)" : ""}
                        </span>
                        <span className={`${color.text}`}>
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

      {/* ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-lg font-semibold">{editingId ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-300 transition hover:text-white"><X /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveItemForm(); }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm text-slate-300">Item name</label>
                  <input
                    value={itemForm.name}
                    onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                    placeholder="e.g., Butter Chicken"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Quantity</label>
                  <input
                    type="number" min={1} value={itemForm.qty}
                    onChange={e => setItemForm(f => ({ ...f, qty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Price ({bill.currency})</label>
                  <input
                    type="number" step="0.01" min={0} inputMode="decimal" value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
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
                          className={`px-3 py-1 rounded-full text-sm border ${on ? `${color.bg} ${color.border} ${color.text}` : "bg-slate-800 text-slate-200 border-slate-700"} ${p.isCurrentUser ? "ring-2 ring-emerald-400" : ""}`}
                        >
                          {p.name} {p.isCurrentUser ? '(You)' : ''}
                        </button>
                      );
                    }) : <div className="text-slate-400 text-sm">No participants available.</div>}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setShowItemModal(false)} className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70">Cancel</button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500">
                  {editingId ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
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
