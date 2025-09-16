import { supabase } from '../supabaseClient';

export async function fetchFriends(userId) {
  const { data, error } = await supabase.from('friends').select('*').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function addFriend(userId, friend) {
  const { data, error } = await supabase.from('friends').insert([{ ...friend, user_id: userId }]).select();
  if (error) throw error;
  return data[0];
}

export async function removeFriend(friendId, userId) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateFriend(friendId, updates) {
  const { data, error } = await supabase.from('friends').update(updates).eq('id', friendId).select();
  if (error) throw error;
  return data[0];
}