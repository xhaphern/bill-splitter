import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, X, Users, Receipt, Calculator, Download, Upload, Pencil, Trash2 as Trash, CreditCard
} from "lucide-react";
import html2canvas from "html2canvas";

const STORAGE_FRIENDS = "bs_friends_v1";
const STORAGE_BILL   = "bs_bill_v1";
const currencySymbols = { MVR: "MVR ", USD: "$", EUR: "€", GBP: "£", INR: "₹", SGD: "S$", AUD: "A$", CAD: "C$", JPY: "¥" };
const fmt = (n) => (Number(n) || 0).toFixed(2);

export default function BillSplitterPreview() {
  // ---- Friends (persisted) ----
  const [friends, setFriends] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_FRIENDS)) || []; } catch { return []; }
  });
  const [newFriend, setNewFriend] = useState({ name: "", account: "" });
  useEffect(() => { localStorage.setItem(STORAGE_FRIENDS, JSON.stringify(friends)); }, [friends]);

  const addFriend = () => {
    const name = newFriend.name.trim();
    if (!name) return;
    if (friends.some(f => f.name.toLowerCase() === name.toLowerCase())) return alert("Friend already exists.");
    setFriends([...friends, { name, account: newFriend.account.trim() }]);
    setNewFriend({ name: "", account: "" });
  };
  const removeFriend = (name) => {
    setFriends(friends.filter(f => f.name !== name));
    setBill(s => ({
      ...s,
      items: s.items.map(it => ({ ...it, participants: (it.participants || []).filter(p => p !== name) })),
      payer: s.payer === name ? "" : s.payer
    }));
  };

  // ---- Bill state (persisted) ----
  const [bill, setBill] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_BILL)) || {
        title: "",
        currency: "MVR",
        discount1: 0,
        serviceCharge: 10,
        discount2: 0,
        gst: 8,
        payer: "",
        items: []
      };
    } catch { return { title: "", currency: "MVR", discount1: 0, serviceCharge: 10, discount2: 0, gst: 8, payer: "", items: [] }; }
  });
  useEffect(() => { localStorage.setItem(STORAGE_BILL, JSON.stringify(bill)); }, [bill]);

  const currencyPrefix = currencySymbols[bill.currency] ?? "";
  const dense = friends.length > 7; // auto-compact when many columns

  // ---- Item modal ----
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", qty: "1", price: "", participants: [] });

  const openAddItem = () => {
    setEditingId(null);
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
    if (!name) return alert("Item name required.");
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return alert("Quantity must be a positive number.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return alert("Price must be 0 or greater.");
    if (!participants.length) return alert("Select at least one participant.");
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
    const perFriendSubtotal = Object.fromEntries(friends.map(f => [f.name, 0]));
    let subtotal = 0;
    bill.items.forEach(it => {
      const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
      subtotal += rowTotal;
      const sel = it.participants || [];
      if (rowTotal > 0 && sel.length) {
        const share = rowTotal / sel.length;
        sel.forEach(p => { perFriendSubtotal[p] = (perFriendSubtotal[p] || 0) + share; });
      }
    });

    const run = { ...perFriendSubtotal };
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

    const perFriendPayable = run;
    const grandPayable = Object.values(run).reduce((a,b)=>a+b,0);

    return { perFriendSubtotal, grandSubtotal: subtotal, rows, perFriendPayable, grandPayable };
  }, [bill.items, bill.discount1, bill.serviceCharge, bill.discount2, bill.gst, friends]);

  const cellShare = (it, name) => {
    const total = Number(it.qty || 0) * Number(it.price || 0);
    const sel = it.participants || [];
    if (!sel.includes(name) || sel.length===0) return 0;
    return total / sel.length;
  };

  // ---- Export (hide actions) ----
  const exportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportImage = async (type="png") => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 50));
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: "#0b0f14" });
      const mime = type === "jpeg" ? "image/jpeg" : "image/png";
      const data = canvas.toDataURL(mime, 0.95);
      const a = document.createElement("a");
      a.href = data; a.download = `${bill.title || "bill"}.${type==="jpeg"?"jpg":"png"}`; a.click();
    } finally { setIsExporting(false); }
  };

  // ---- JSON ----
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ friends, bill }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`${bill.title||"bill"}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const importJSON = () => {
    const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json";
    inp.onchange=()=>{ const f=inp.files?.[0]; if(!f) return; const r=new FileReader();
      r.onload=(e)=>{ try{ const obj=JSON.parse(e.target.result);
        if(!obj?.friends || !obj?.bill) throw new Error();
        localStorage.setItem(STORAGE_FRIENDS, JSON.stringify(obj.friends));
        localStorage.setItem(STORAGE_BILL, JSON.stringify(obj.bill));
        window.location.reload();
      }catch{ alert("Invalid file."); } }; r.readAsText(f); };
    inp.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header small */}
        <div className="text-center mb-3">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center justify-center gap-3">
            <Receipt className="text-green-400" /> Bill Splitter
          </h1>
          <p className="text-gray-400 text-sm">Add friends, add items, itemized breakdown, payer & export as image</p>
        </div>

        {/* Top controls: shorter title, buttons wrap */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <input
              value={bill.title}
              onChange={(e) => setBill(s => ({ ...s, title: e.target.value }))}
              placeholder="Bill title"
              className="flex-1 max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 truncate"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={exportJSON} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"><Download size={16}/> Export JSON</button>
              <button onClick={importJSON} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"><Upload size={16}/> Import JSON</button>
              <button onClick={() => exportImage("png")} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"><Download size={16}/> Export PNG</button>
              <button onClick={() => exportImage("jpeg")} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"><Download size={16}/> Export JPEG</button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Friends */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <Users className="text-green-400" /> Friends
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  placeholder="Name (e.g., Shaffan)"
                  value={newFriend.name}
                  onChange={e => setNewFriend(v => ({ ...v, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addFriend()}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500"
                />
                <input
                  placeholder="Account number (optional)"
                  value={newFriend.account}
                  onChange={e => setNewFriend(v => ({ ...v, account: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button onClick={addFriend} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1 mb-3">
                <Plus size={16}/> Add Friend
              </button>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <div key={f.name} className="bg-green-700 text-green-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {f.name}
                    <button onClick={() => removeFriend(f.name)} className="text-green-200 hover:text-white"><X size={14}/></button>
                  </div>
                ))}
                {!friends.length && <div className="text-gray-400 text-sm">Add at least one friend.</div>}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <Calculator className="text-green-400" /> Settings
              </h2>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Currency</label>
                  <select
                    value={bill.currency}
                    onChange={(e) => setBill(s => ({ ...s, currency: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    {Object.keys(currencySymbols).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discount 1 (%)</label>
                  <input type="number" value={bill.discount1}
                    onChange={e => setBill(s => ({ ...s, discount1: parseFloat(e.target.value)||0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Service Charge (%)</label>
                  <input type="number" value={bill.serviceCharge}
                    onChange={e => setBill(s => ({ ...s, serviceCharge: parseFloat(e.target.value)||0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discount 2 (%)</label>
                  <input type="number" value={bill.discount2}
                    onChange={e => setBill(s => ({ ...s, discount2: parseFloat(e.target.value)||0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">GST (%)</label>
                  <input type="number" value={bill.gst}
                    onChange={e => setBill(s => ({ ...s, gst: parseFloat(e.target.value)||0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                </div>
              </div>
            </div>

            {/* Items + Payer */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Receipt className="text-green-400" /> Items
                </h2>
                <button onClick={openAddItem} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1">
                  <Plus size={16}/> Add Item
                </button>
              </div>
              {!bill.items.length && <p className="text-gray-400 text-sm mt-3">No items yet.</p>}
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                <CreditCard className="text-green-400" /> Payer
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Who paid?</label>
                  <select
                    value={bill.payer}
                    onChange={e => setBill(s => ({ ...s, payer: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">Select payer</option>
                    {friends.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Payer account number</label>
                  <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                    {(bill.payer && friends.find(f => f.name === bill.payer)?.account) || <span className="text-gray-400">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Table */}
          <div className="space-y-3">
            <div ref={exportRef} className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              {/* Title compact */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-semibold text-base truncate max-w-[50%]" title={bill.title || "Untitled bill"}>
                  {bill.title || "Untitled bill"}
                </div>
                {bill.payer && (
                  <div className="text-gray-300 text-xs">
                    Payer: <b className="text-white">{bill.payer}</b>{" • "}
                    Account: <b className="text-white">{friends.find(f => f.name === bill.payer)?.account || "—"}</b>
                  </div>
                )}
              </div>

              <h2 className="text-lg font-semibold mb-2 text-white">Itemized Split</h2>

              <div className="text-sm">
                <table className="min-w-full">
                  <thead className="text-white">
                    <tr className={`bg-gray-950`}>
                      <th className={`text-left p-2`}>#</th>
                      <th className={`text-left p-2`}>Item</th>
                      <th className={`text-right p-2`}>Qty</th>
                      {friends.map(f => (
                        <th key={`h-${f.name}`} className={`text-right font-semibold p-2 whitespace-normal break-words max-w-[90px]`}>
                          {f.name}
                        </th>
                      ))}
                      <th className={`text-right p-2`}>Row Total</th>
                      {!isExporting && <th className={`p-2 text-right`}>Edit</th>}
                    </tr>
                  </thead>

                  <tbody className="text-gray-100">
                    {bill.items.map((it, idx) => {
                      const rowTotal = Number(it.qty || 0) * Number(it.price || 0);
                      return (
                        <tr key={it.id} className={idx % 2 ? "bg-gray-700/40" : "bg-gray-700/20"}>
                          <td className={`p-2 text-right`}>{idx + 1}</td>
                          <td className={`p-2`}>{it.name || <span className="text-gray-400">—</span>}</td>
                          <td className={`p-2 text-right`}>{it.qty || 0}</td>
                          {friends.map(f => (
                            <td key={`cell-${it.id}-${f.name}`} className={`p-2 text-right`}>
                              {fmt(cellShare(it, f.name))}
                            </td>
                          ))}
                          <td className={`p-2 text-right`}>{fmt(rowTotal)}</td>
                          {!isExporting && (
                            <td className={`p-2 text-right`}>
                              <button onClick={() => openEditItem(it)} className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-600 hover:bg-gray-500 text-white mr-1"><Pencil size={14}/></button>
                              <button onClick={() => deleteItem(it.id)} className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-600 hover:bg-red-700 text-white"><Trash size={14}/></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {!bill.items.length && (
                      <tr><td colSpan={friends.length + (isExporting ? 5 : 6)} className="p-4 text-center text-gray-400">Add items to see the breakdown.</td></tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-gray-900 text-white">
                      <td className="p-2 font-semibold" colSpan={3}>SUM</td>
                      {friends.map(f => (
                        <td key={`sum-${f.name}`} className="p-2 text-right">{fmt(calc.perFriendSubtotal[f.name] || 0)}</td>
                      ))}
                      <td className="p-2 text-right">{fmt(calc.grandSubtotal)}</td>
                      {!isExporting && <td></td>}
                    </tr>

                    {calc.rows.map((r, i) => (
                      <tr key={`stage-${i}`} className="bg-gray-900/60 text-white">
                        <td className="p-2" colSpan={3}>{r.label}</td>
                        {friends.map(f => (
                          <td key={`stage-${i}-${f.name}`} className="p-2 text-right">{fmt(Math.abs(r.delta[f.name] || 0))}</td>
                        ))}
                        <td className="p-2 text-right">{fmt(Math.abs(r.totalDelta))}</td>
                        {!isExporting && <td></td>}
                      </tr>
                    ))}

                    <tr className="bg-green-950">
                      <td className="p-2 font-bold text-green-300" colSpan={3}>PAYABLE</td>
                      {friends.map(f => (
                        <td key={`pay-${f.name}`} className="p-2 text-right font-bold text-green-400">
                          {currencyPrefix}{fmt(calc.perFriendPayable[f.name] || 0)}
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
        </div>
      </div>

      {/* ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-lg font-semibold">{editingId ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-gray-300 hover:text-white"><X /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveItemForm(); }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-300 mb-1">Item name</label>
                  <input
                    value={itemForm.name}
                    onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="e.g., Butter Chicken"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number" min={1} value={itemForm.qty}
                    onChange={e => setItemForm(f => ({ ...f, qty: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Price ({bill.currency})</label>
                  <input
                    type="number" step="0.01" min={0} inputMode="decimal" value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-300 mb-1">Share with (select participants)</label>
                  <div className="flex flex-wrap gap-2">
                    {friends.length ? friends.map(fr => {
                      const on = itemForm.participants.includes(fr.name);
                      return (
                        <button
                          key={fr.name}
                          type="button"
                          onClick={() => toggleFormParticipant(fr.name)}
                          className={`px-3 py-1 rounded-full text-sm ${on ? "bg-green-600 text-white" : "bg-gray-600 text-gray-200"}`}
                        >
                          {fr.name}
                        </button>
                      );
                    }) : <div className="text-gray-400 text-sm">Add friends first.</div>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                  {editingId ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
