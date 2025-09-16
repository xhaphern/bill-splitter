// src/api/supaBills.js
import { supabase } from '../supabaseClient'

export async function saveBill({ title, currency = 'MVR', payload }) {
  // get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const user_id = user ? user.id : null  // null for anonymous saves

  const { data, error } = await supabase
    .from('bills')
    .insert([{ user_id, title, currency, payload }])
    .select()

  if (error) throw error
  return data[0]
}

export async function listBills() {
  // Only return the signed-in user's bills
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) return [] // not signed in -> no personal history

  const { data, error } = await supabase
    .from('bills')
    .select('id,title,currency,total,created_at,payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteBill(id) {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id)
  if (error) throw error
}