import { supabase } from "../supabaseClient";
import type { Database } from "../types/database";

type CircleRow = Database["public"]["Tables"]["friend_circles"]["Row"];
type FriendRow = Database["public"]["Tables"]["friends"]["Row"];
type CircleMemberRow = Database["public"]["Tables"]["friend_circle_members"]["Row"];

// Circles are optional. These helpers no-op gracefully if backend tables are missing.

export async function fetchCircles(userId: string): Promise<Array<Pick<CircleRow, "id" | "name">>> {
  const { data, error } = await supabase
    .from("friend_circles")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as Array<Pick<CircleRow, "id" | "name">>) ?? [];
}

export async function fetchCircleMembers(userId: string, circleId: string): Promise<FriendRow[]> {
  const { data, error } = await supabase
    .from("friend_circle_members")
    .select("friend_id, friends:friends!friend_id(id, name, account, phone, user_id, created_at)")
    .eq("user_id", userId)
    .eq("circle_id", circleId);
  if (error) return [];

  type JoinedRow = CircleMemberRow & { friends: FriendRow | null };

  return ((data as JoinedRow[]) ?? [])
    .map((row) => row.friends)
    .filter((friend): friend is FriendRow => Boolean(friend))
    .map((friend) => ({ ...friend, phone: friend.phone ?? null }));
}

// Fetch member ids for all circles of a user, then count per circle in app code.
export async function fetchCircleMemberCounts(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("friend_circle_members")
    .select("circle_id, friend_id")
    .eq("user_id", userId);
  if (error) return {};

  return ((data as Array<Pick<CircleMemberRow, "circle_id" | "friend_id">>) ?? []).reduce<
    Record<string, number>
  >((acc, row) => {
    if (!row?.circle_id) return acc;
    acc[row.circle_id] = (acc[row.circle_id] || 0) + 1;
    return acc;
  }, {});
}

export async function createCircle(userId: string, name: string): Promise<CircleRow | null> {
  const payload: Database["public"]["Tables"]["friend_circles"]["Insert"] = {
    user_id: userId,
    name,
  };

  const { data, error } = await supabase.from("friend_circles").insert([payload]).select();
  if (error) throw error;
  return (data as CircleRow[] | null)?.[0] ?? null;
}

export async function deleteCircle(userId: string, circleId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_circles")
    .delete()
    .eq("id", circleId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function addCircleMember(userId: string, circleId: string, friendId: string): Promise<void> {
  const payload: Database["public"]["Tables"]["friend_circle_members"]["Insert"] = {
    user_id: userId,
    circle_id: circleId,
    friend_id: friendId,
  };

  const { error } = await supabase.from("friend_circle_members").insert([payload]);
  if (error) throw error;
}

export async function removeCircleMember(
  userId: string,
  circleId: string,
  friendId: string,
): Promise<void> {
  const { error } = await supabase
    .from("friend_circle_members")
    .delete()
    .eq("user_id", userId)
    .eq("circle_id", circleId)
    .eq("friend_id", friendId);
  if (error) throw error;
}
