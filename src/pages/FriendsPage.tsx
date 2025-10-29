import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserPlus, CreditCard, Phone, Search, MoreVertical, PlusCircle, Trash2, SaveIcon, Loader2, X } from '../icons'
import { colorFromName, hueFromName, colorFromHue } from '../utils/colors'
import { supabase } from '../supabaseClient'
import { fetchCircles, fetchCircleMembers, createCircle, deleteCircle, addCircleMember, removeCircleMember, fetchCircleMemberCounts } from '../api/supaCircles'

const friendColor = colorFromName

const normalizePhone = (value = '') => (value ? value.replace(/\D/g, '').slice(0, 15) : '')

export default function FriendsPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState([])
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, name: '', phone: '', account: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  // Circles
  const [circles, setCircles] = useState([])
  const [selectedCircle, setSelectedCircle] = useState('')
  const [circleMembers, setCircleMembers] = useState([])
  const [circleMembersCache, setCircleMembersCache] = useState({})
  const [membersLoading, setMembersLoading] = useState(false)
  const [circleCounts, setCircleCounts] = useState({})
  const [newCircleName, setNewCircleName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState([])

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    const s = data.session ?? null
    setSession(s)
    if (!s) {
      setLoading(false)
      return
    }

    try {
      // Run all queries in parallel for much faster loading
      const [friendsResult, circlesResult] = await Promise.all([
        supabase
          .from('friends')
          .select('id, name, account, phone')
          .eq('user_id', s.user.id)
          .order('created_at', { ascending: true })
          .limit(200),
        fetchCircles(s.user.id).catch(() => [])
      ]);

      if (friendsResult.error) {
        setError(friendsResult.error.message)
      } else {
        setFriends((friendsResult.data || []).map((row) => ({ ...row, phone: row.phone || '' })))
      }

      // Load circle data in parallel
      const cs = circlesResult || []
      setCircles(cs)

      if (cs.length > 0) {
        const targetCircle = selectedCircle || cs[0].id
        setSelectedCircle(targetCircle)

        // Fetch counts and members in parallel
        const [counts, members] = await Promise.all([
          fetchCircleMemberCounts(s.user.id).catch(() => ({})),
          fetchCircleMembers(s.user.id, targetCircle).catch(() => [])
        ]);

        setCircleCounts(counts)
        setCircleMembers(members)
      }
    } catch (err) {
      console.error('Refresh error:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh())
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // close menu when clicking elsewhere
    if (openMenu === null) return
    const handler = () => setOpenMenu(null)
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [openMenu])

  const validatePhoneInput = (value, requirePhone) => {
    const normalized = normalizePhone(value)
    const digitsOnly = normalized.replace(/\D/g, '')
    if (requirePhone) {
      if (!normalized) return { ok: false, message: 'Mobile number is required' }
      if (digitsOnly.length < 7) return { ok: false, message: 'Mobile number must be at least 7 digits' }
    } else if (normalized && digitsOnly.length < 7) {
      return { ok: false, message: 'Enter at least 7 digits for the mobile number' }
    }
    return { ok: true, normalized, digits: digitsOnly }
  }

  const applyFriendPatch = (id, patch) => {
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setCircleMembers((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setFriendCatalog((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setCircleMembersCache((prev) => {
      const next = {}
      Object.entries(prev).forEach(([key, members]) => {
        next[key] = members.map((m) => (m.id === id ? { ...m, ...patch } : m))
      })
      return next
    })
  }

  const openEditFriend = (friend) => {
    setEditForm({
      id: friend.id,
      name: friend.name || '',
      phone: friend.phone || '',
      account: friend.account || '',
    })
    setEditError('')
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditForm({ id: null, name: '', phone: '', account: '' })
    setEditError('')
  }

  async function addFriend(e) {
    if (e?.preventDefault) e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Name is required')

    const { ok, normalized, digits, message } = validatePhoneInput(phone, Boolean(session))
    if (!ok) return setError(message)

    if (digits) {
      const duplicate = friends.some(
        (f) => normalizePhone(f.phone).replace(/\D/g, '') === digits
      )
      if (duplicate) return setError('This mobile number is already saved')
    }

    const cleanAccount = account.trim().slice(0, 13) || null
    const phoneValue = normalized || ''

    if (!session) {
      const localFriend = {
        id: `local-${Date.now()}`,
        name: name.trim(),
        account: cleanAccount,
        phone: phoneValue,
      }
      setFriends((prev) => [...prev, localFriend])
      setName('')
      setAccount('')
      setPhone('')
      return
    }

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        account: cleanAccount,
        phone: normalized || null,
      })

    if (error) return setError(error.message)

    setName('')
    setAccount('')
    setPhone('')
    refresh()
  }

  const handleEditSubmit = async () => {
    if (!editForm.id) return
    setEditError('')

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      setEditError('Name is required')
      return
    }

    const requirePhone = Boolean(session)
    const { ok, normalized, digits, message } = validatePhoneInput(editForm.phone, requirePhone)
    if (!ok) {
      setEditError(message)
      return
    }

    if (digits) {
      const duplicate = friends.some(
        (f) => f.id !== editForm.id && normalizePhone(f.phone).replace(/\D/g, '') === digits
      )
      if (duplicate) {
        setEditError('This mobile number is already saved')
        return
      }
    }

    const cleanAccount = editForm.account.trim().slice(0, 13) || null

    setEditSaving(true)
    try {
      if (!session || String(editForm.id).startsWith('local-')) {
        applyFriendPatch(editForm.id, {
          name: trimmedName,
          phone: normalized || '',
          account: cleanAccount,
        })
      } else {
        const { error } = await supabase
          .from('friends')
          .update({ name: trimmedName, phone: normalized || null, account: cleanAccount })
          .eq('id', editForm.id)
          .eq('user_id', session.user.id)

        if (error) throw error

        applyFriendPatch(editForm.id, {
          name: trimmedName,
          phone: normalized,
          account: cleanAccount,
        })
      }

      closeEditModal()
    } catch (err) {
      console.error('Failed to update friend', err)
      setEditError(err.message || 'Failed to update friend')
    } finally {
      setEditSaving(false)
    }
  }

  async function removeFriend(id) {
    setError('')
    if (!session || String(id).startsWith('local-')) {
      setFriends((prev) => prev.filter((f) => f.id !== id))
      return
    }
    const { error } = await supabase.from('friends').delete().eq('id', id)
    if (error) return setError(error.message)
    refresh()
  }

  const filteredFriends = friends.filter((f) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    const phoneTerm = term.replace(/\D/g, '')
    return (
      f.name.toLowerCase().includes(term) ||
      (!!f.account && f.account.toLowerCase().includes(term)) ||
      (!!f.phone && f.phone.toLowerCase().includes(term)) ||
      (!!f.phone && phoneTerm && f.phone.replace(/\D/g, '').includes(phoneTerm))
    )
  })

  // Derived: candidates to add to selected circle
  // Compute client-side fallback candidates from already-loaded friends
  const circleCandidateFriends = friends
    .filter((f) => {
      const term = memberSearch.trim().toLowerCase()
      if (!term) return true
      const phoneTerm = term.replace(/\D/g, '')
      return (
        f.name.toLowerCase().includes(term) ||
        (!!f.account && f.account.toLowerCase().includes(term)) ||
        (!!f.phone && f.phone.toLowerCase().includes(term)) ||
        (!!f.phone && phoneTerm && f.phone.replace(/\D/g, '').includes(phoneTerm))
      )
    })
    .filter((f) => !circleMembers.some((m) => m.id === f.id))
    .slice(0, 8)

  // Server-side search so users can find saved friends even if not in current view
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!session || !selectedCircle) { setMemberSearchResults([]); return }
      const term = memberSearch.trim()
      if (!term) { setMemberSearchResults([]); return }
      const digitTerm = term.replace(/\D/g, '')
      const escapeFilterValue = (value = '') => value.replace(/([,()])/g, '\\$1')
      const escapedTerm = escapeFilterValue(term)
      const orFilters = [
        `name.ilike.%${escapedTerm}%`,
        `account.ilike.%${escapedTerm}%`,
        `phone.ilike.%${escapedTerm}%`,
      ]
      if (digitTerm) {
        orFilters.push(`phone.ilike.%${digitTerm}%`)
      }
      const { data, error } = await supabase
        .from('friends')
        .select('id, name, account, phone')
        .eq('user_id', session.user.id)
        .or(orFilters.join(','))
        .order('created_at', { ascending: true })
        .limit(8)
      if (cancelled) return
      if (error) { setMemberSearchResults([]); return }
      setMemberSearchResults((data || []).map((row) => ({ ...row, phone: row.phone || '' })))
    }
    run()
    return () => { cancelled = true }
  }, [memberSearch, selectedCircle, session, circleMembers])

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-slate-300">
        Loading…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-container page-container">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 card-padding text-center shadow-xl backdrop-blur">
          <h1 className="mb-2 text-2xl font-semibold text-white">Friends</h1>
          <p className="mb-6 text-sm text-emerald-200/70">
            Sign in to save your friends and organize them into circles for quick access when splitting bills.
          </p>
          <Link
            to="/login"
            state={{ from: '/friends', message: 'Sign in to save your friends and organize them into circles for quick access when splitting bills.' }}
            className="btn-apple btn-primary"
          >
            Sign in to manage friends
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container page-container space-y-6 text-slate-100">
      {/* Add a friend (moved to top) */}
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 card-padding shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <UserPlus size={18} className="text-emerald-300" /> Add a friend
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFriend(e);
              }
            }}
            placeholder="Friend name"
            className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          />
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white">
            <Phone size={16} className="text-emerald-300" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, '').slice(0, 16))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFriend(e);
                }
              }}
              placeholder="Mobile (+15551234567)"
              inputMode="tel"
              minLength={7}
              className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white">
            <CreditCard size={16} className="text-emerald-300" />
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.slice(0, 13))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFriend(e);
                }
              }}
              placeholder="Account (optional)"
              maxLength={13}
              className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={addFriend}
              className="btn-apple btn-primary"
            >
              <SaveIcon size={14} /> Save friend
            </button>
          </div>
        </div>
      </div>

      {/* Circles manager */}
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 card-padding shadow-xl backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Users className="text-emerald-300" size={18} /> Circles
            </h2>
            <p className="text-sm text-emerald-200/70">Group friends to quickly add participants on Split.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="New circle name"
              className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                if (!newCircleName.trim()) return
                try {
                  const row = await createCircle(session.user.id, newCircleName.trim())
                  setCircles((prev) => [...prev, row])
                  setSelectedCircle(row.id)
                  setCircleMembers([])
                  setNewCircleName('')
                } catch (e) {
                  setError(e.message || 'Failed to create circle')
                }
              }}
              className="btn-apple btn-primary"
            >
              <PlusCircle size={16} /> Create
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-emerald-200/70">Your circles</label>
            <div className="mt-2 space-y-2">
              {circles.length === 0 ? (
                <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-sm text-slate-300">No circles yet.</div>
              ) : (
                circles.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${selectedCircle === c.id ? 'border-emerald-500/60 bg-emerald-900/20' : 'border-slate-700/70 bg-slate-950/70'}`}>
                    <button
                      type="button"
                      onClick={async () => {
                        setSelectedCircle(c.id)
                        const cached = circleMembersCache[c.id]
                        if (cached) {
                          setCircleMembers(cached.map((m) => ({ ...m, phone: m.phone || '' })))
                          setMembersLoading(false)
                        } else {
                          setCircleMembers([])
                          setMembersLoading(true)
                          try {
                            const ms = await fetchCircleMembers(session.user.id, c.id)
                            const normalizedMembers = ms.map((m) => ({ ...m, phone: m.phone || '' }))
                            setCircleMembersCache((prev) => ({ ...prev, [c.id]: normalizedMembers }))
                            setCircleMembers(normalizedMembers)
                          } catch (_) { setCircleMembers([]) }
                          finally { setMembersLoading(false) }
                        }
                      }}
                      className="text-left text-sm text-slate-200"
                    >
                      <span>{c.name}</span>
                      <span className="ml-2 rounded-full border border-emerald-600/40 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-200">{circleCounts[c.id] ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteCircle(session.user.id, c.id)
                          setCircles((prev) => prev.filter((x) => x.id !== c.id))
                          if (selectedCircle === c.id) { setSelectedCircle(''); setCircleMembers([]) }
                          setCircleCounts((prev) => { const cp = { ...prev }; delete cp[c.id]; return cp })
                        } catch (e) {
                          setError(e.message || 'Failed to delete circle')
                        }
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-red-300 hover:bg-red-500/10"
                      aria-label="Delete circle"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-emerald-200/70 flex items-center gap-2">
              <span>Members {selectedCircle ? '' : '(select a circle)'}</span>
              {membersLoading && <Loader2 className="animate-spin text-emerald-300" size={14} />}
            </label>
            {selectedCircle ? (
              <div className="mt-2 space-y-3">
                <div className="flex items-center rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm">
                  <Search size={16} className="mr-2 text-slate-400" />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search saved friends to add"
                    className="w-full bg-transparent text-slate-200 focus:outline-none"
                  />
                </div>
                {memberSearch.trim() && (
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2">
                    {(memberSearchResults.length ? memberSearchResults : circleCandidateFriends).length === 0 ? (
                      <div className="px-2 py-1 text-sm text-slate-400">No matches</div>
                    ) : (
                      (memberSearchResults.length ? memberSearchResults : circleCandidateFriends).map((f) => {
                        const isMember = circleMembers.some((m) => m.id === f.id)
                        return (
                          <div
                            key={f.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-800/70"
                          >
                            <div className="text-slate-200 truncate">
                              {f.name}
                              {f.phone ? ` · ${f.phone}` : ''}
                              {f.account ? ` · ${f.account}` : ''}
                            </div>
                            {isMember ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await removeCircleMember(session.user.id, selectedCircle, f.id)
                                    setCircleMembers((prev) => prev.filter((x) => x.id !== f.id))
                                    setCircleMembersCache((prev) => ({ ...prev, [selectedCircle]: (prev[selectedCircle] || []).filter((x) => x.id !== f.id) }))
                                    setCircleCounts((prev) => ({ ...prev, [selectedCircle]: Math.max(0, (prev[selectedCircle] || 1) - 1) }))
                                    setMemberSearch('')
                                  } catch (e) { setError(e.message || 'Failed to remove member') }
                                }}
                                className="ml-3 inline-flex items-center rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await addCircleMember(session.user.id, selectedCircle, f.id)
                                    const sanitized = { ...f, phone: f.phone || '' }
                                    setCircleMembers((prev) => [...prev, sanitized])
                                    setCircleMembersCache((prev) => ({ ...prev, [selectedCircle]: [ ...(prev[selectedCircle] || []), sanitized ] }))
                                    setCircleCounts((prev) => ({ ...prev, [selectedCircle]: (prev[selectedCircle] || 0) + 1 }))
                                    setMemberSearch('')
                                  } catch (e) { setError(e.message || 'Failed to add member') }
                                }}
                                className="ml-3 inline-flex items-center rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {circleMembers.length === 0 ? (
                    <div className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-300">{membersLoading ? 'Loading members…' : 'No members yet.'}</div>
                  ) : (
                    circleMembers.map((m) => {
                      const col = friendColor(m.name)
                      return (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                        style={{ backgroundColor: col.bg, borderColor: col.border }}
                        title={[m.name, m.phone, m.account].filter(Boolean).join(' · ')}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.dot }}></span>
                        <span style={{ color: col.text }}>{m.name}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await removeCircleMember(session.user.id, selectedCircle, m.id)
                              setCircleMembers((prev) => prev.filter((x) => x.id !== m.id))
                              setCircleMembersCache((prev) => ({
                                ...prev,
                                [selectedCircle]: (prev[selectedCircle] || []).filter((x) => x.id !== m.id),
                              }))
                              setCircleCounts((prev) => ({
                                ...prev,
                                [selectedCircle]: Math.max(0, (prev[selectedCircle] || 1) - 1),
                              }))
                            } catch (e) { setError(e.message || 'Failed to remove member') }
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-slate-200 hover:bg-red-500/20"
                        >
                          ×
                        </button>
                      </span>
                    )})
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-sm text-slate-300">Select a circle to manage members.</div>
            )}
          </div>
        </div>
      </div>
      {/* Friends header + search */}
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 card-padding shadow-xl backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Users className="text-emerald-300" size={20} /> Friends
            </h1>
            <p className="text-sm text-emerald-200/70">Keep the people you split with in one place.</p>
          </div>
          <div className="rounded-full border border-slate-600/60 px-4 py-1.5 text-sm text-slate-200">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'} saved
          </div>
        </div>
        <div className="mt-4 flex items-center rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <Search size={16} className="mr-2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search friends"
            className="w-full bg-transparent focus:outline-none"
          />
        </div>
        {/* Inline friends list */}
            <div className="mt-4">
              {filteredFriends.length === 0 ? (
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-4 text-sm text-slate-300">
              No friends yet. Add your first friend above to start splitting smarter.
            </div>
          ) : (
            <div className="relative rounded-2xl border border-slate-700/60 overflow-visible">
              {(() => { const used = new Set(); const unique = (n) => { let h = hueFromName(n); const step = 23; const prox = 12; for (let i=0;i<360;i++){ let ok=true; for (const uh of used){ const d=Math.min(Math.abs(uh-h),360-Math.abs(uh-h)); if (d < prox){ ok=false; break; } } if (ok){ used.add(h); return colorFromHue(h); } h=(h+step)%360; } return colorFromHue(h); }; return filteredFriends.map((f, idx) => { const col = unique(f.name);
                return (
                  <div
                    key={f.id}
                    className={`relative flex items-center justify-between gap-2 px-4 py-3 ${idx ? 'border-t border-slate-700/50' : ''} bg-slate-900/70`}
                  >
                    <div className="min-w-0 pr-10">
                      <div className="flex items-center gap-2 text-base font-semibold text-white">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold" style={{ backgroundColor: col.bg, color: col.text, borderColor: 'rgba(255,255,255,0.2)' }}>
                          {f.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-emerald-200/80">
                        <Phone size={14} />
                        <span className="break-all">{f.phone || 'Mobile not saved'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-emerald-200/80">
                        <CreditCard size={14} />
                        <span className="break-all">{f.account || 'Account not saved'}</span>
                      </div>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenu(openMenu === f.id ? null : f.id)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:bg-slate-800/60"
                        aria-label="Friend actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === f.id && (
                        <div
                          className="action-menu absolute right-0 top-0 z-30 -translate-y-full transform"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="menu-item"
                            onClick={() => {
                              setOpenMenu(null)
                              openEditFriend(f)
                            }}
                          >
                            <div className="menu-item-leading">
                              <div className="menu-item-symbol">✎</div>
                              <div className="menu-item-content">
                                <div className="menu-item-label">Edit</div>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="menu-item menu-item-danger"
                            onClick={() => {
                              setOpenMenu(null)
                              removeFriend(f.id)
                            }}
                          >
                            <div className="menu-item-leading">
                              <div className="menu-item-symbol">🗑</div>
                              <div className="menu-item-content">
                                <div className="menu-item-label">Delete</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })})()}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-200 shadow">
          {error}
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <UserPlus size={18} className="text-emerald-300" /> Edit friend
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 hover:bg-slate-800/70"
                aria-label="Close edit friend"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Friend name"
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white">
                <Phone size={16} className="text-emerald-300" />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Mobile (+15551234567)"
                  inputMode="tel"
                  className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white">
                <CreditCard size={16} className="text-emerald-300" />
                <input
                  value={editForm.account}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 13)
                    setEditForm((prev) => ({ ...prev, account: next }))
                  }}
                  placeholder="Account (optional)"
                  maxLength={13}
                  className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              {editError && (
                <div className="rounded-xl border border-red-500/40 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                  {editError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={editSaving}
                >
                  {editSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <SaveIcon size={14} /> Save changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends list is rendered inside the Friends card above */}
    </div>
  )
}
