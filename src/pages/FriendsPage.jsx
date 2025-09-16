import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserPlus, CreditCard, Search, MoreVertical } from 'lucide-react'
import { supabase } from '../supabaseClient'

const friendPalette = [
  { dot: 'bg-emerald-400', text: 'text-emerald-200', bg: 'bg-emerald-500/20' },
  { dot: 'bg-sky-400', text: 'text-sky-200', bg: 'bg-sky-500/20' },
  { dot: 'bg-indigo-400', text: 'text-indigo-200', bg: 'bg-indigo-500/20' },
  { dot: 'bg-amber-400', text: 'text-amber-200', bg: 'bg-amber-500/20' },
  { dot: 'bg-fuchsia-400', text: 'text-fuchsia-200', bg: 'bg-fuchsia-500/20' },
  { dot: 'bg-teal-400', text: 'text-teal-200', bg: 'bg-teal-500/20' },
  { dot: 'bg-rose-400', text: 'text-rose-200', bg: 'bg-rose-500/20' },
]

const friendColor = (name) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return friendPalette[Math.abs(hash) % friendPalette.length]
}

export default function FriendsPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState([])
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    const s = data.session ?? null
    setSession(s)
    if (!s) {
      setLoading(false)
      return
    }

    const { data: rows, error } = await supabase
      .from('friends')
      .select('id, name, account')
      .eq('user_id', s.user.id) // only this user’s friends
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    setFriends(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh())
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (openMenu === null) return
    const handler = () => setOpenMenu(null)
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [openMenu])

  async function addFriend(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required')

    const cleanAccount = account.trim().slice(0, 13) || null

    if (!session) {
      if (editingId) {
        setFriends((prev) =>
          prev.map((f) => (f.id === editingId ? { ...f, name: name.trim(), account: cleanAccount } : f))
        )
        setEditingId(null)
      } else {
        const localFriend = { id: `local-${Date.now()}`, name: name.trim(), account: cleanAccount }
        setFriends((prev) => [...prev, localFriend])
      }
      setName('')
      setAccount('')
      return
    }

    if (editingId && !String(editingId).startsWith('local-')) {
      const { error } = await supabase
        .from('friends')
        .update({ name: name.trim(), account: cleanAccount })
        .eq('id', editingId)

      if (error) return setError(error.message)
      setEditingId(null)
    } else if (editingId && String(editingId).startsWith('local-')) {
      setFriends((prev) =>
        prev.map((f) => (f.id === editingId ? { ...f, name: name.trim(), account: cleanAccount } : f))
      )
      setEditingId(null)
    } else {
      const { error } = await supabase
        .from('friends')
        .insert({ user_id: session.user.id, name: name.trim(), account: cleanAccount })

      if (error) return setError(error.message)
    }

    setName('')
    setAccount('')
    refresh()
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

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  )

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setAccount('')
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-slate-300">
        Loading…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 text-center shadow-xl backdrop-blur">
          <h1 className="mb-2 text-2xl font-semibold text-white">Friends</h1>
          <p className="mb-6 text-sm text-emerald-200/70">
            Sign in to build your circles and keep favourite payers handy.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 text-slate-100">
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur">
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
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-200 shadow">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <UserPlus size={18} className="text-emerald-300" /> Add a friend
        </div>
        <form onSubmit={addFriend} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friend name"
            className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          />
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white">
            <CreditCard size={16} className="text-emerald-300" />
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.slice(0, 13))}
              placeholder="Account (optional)"
              maxLength={13}
              className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
            >
              {editingId ? 'Update friend' : 'Save friend'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="ml-2 inline-flex items-center justify-center rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {filteredFriends.length === 0 ? (
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-sm text-slate-200/80 shadow">
          No friends yet. Add your first friend above to start splitting smarter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFriends.map((f) => {
            const palette = friendColor(f.name)
            return (
              <div
                key={f.id}
                className="relative flex flex-col gap-2 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-xl backdrop-blur"
              >
                <div className="min-w-0 pr-12">
                  <div className="flex items-center gap-2 text-base font-semibold text-white">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-xs font-semibold ${palette.bg} ${palette.text}`}>
                      {f.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{f.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-emerald-200/80">
                    <CreditCard size={14} />
                    <span className="break-all">{f.account || 'No account on file'}</span>
                  </div>
                </div>
                <div className="absolute right-4 top-3">
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
                    className="absolute right-0 top-0 z-30 w-36 -translate-y-full transform rounded-xl border border-slate-700/70 bg-slate-900/95 p-2 text-sm text-slate-100 shadow"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-800/70"
                        onClick={() => {
                          setOpenMenu(null)
                          setEditingId(f.id)
                          setName(f.name)
                          setAccount(f.account || '')
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-red-200 hover:bg-red-500/10"
                        onClick={() => {
                          setOpenMenu(null)
                          removeFriend(f.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
