import { supabase } from "../supabaseClient";

// Circles are optional. These helpers no-op gracefully if backend tables are missing.

export async function fetchCircles(userId) {
  const { data, error } = await supabase
    .from("friend_circles")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function fetchCircleMembers(userId, circleId) {
  // Use explicit FK join alias to avoid ambiguous relationships
  const { data, error } = await supabase
    .from("friend_circle_members")
    .select("friend_id, friends:friends!friend_id(id, name, account)")
    .eq("user_id", userId)
    .eq("circle_id", circleId);
  if (error) return [];
  return (data || []).map((row) => row.friends).filter(Boolean);
}

export async function createCircle(userId, name) {
  const { data, error } = await supabase
    .from("friend_circles")
    .insert([{ user_id: userId, name }])
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteCircle(userId, circleId) {
  const { error } = await supabase
    .from("friend_circles")
    .delete()
    .eq("id", circleId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function addCircleMember(userId, circleId, friendId) {
  const { error } = await supabase
    .from("friend_circle_members")
    .insert([{ user_id: userId, circle_id: circleId, friend_id: friendId }]);
  if (error) throw error;
}

export async function removeCircleMember(userId, circleId, friendId) {
  const { error } = await supabase
    .from("friend_circle_members")
    .delete()
    .eq("user_id", userId)
    .eq("circle_id", circleId)
    .eq("friend_id", friendId);
  if (error) throw error;
}
