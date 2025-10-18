import { supabase } from "../supabaseClient";
import type { Database } from "../types/database";

type FriendRow = Database["public"]["Tables"]["friends"]["Row"];
type FriendPayload = {
  name: string;
  account?: string | null;
  phone?: string | null;
};
type FriendUpdate = Partial<Pick<FriendRow, "name" | "account" | "phone">>;

export async function fetchFriends(userId: string): Promise<FriendRow[]> {
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function addFriend(userId: string, friend: FriendPayload): Promise<FriendRow> {
  const payload: Database["public"]["Tables"]["friends"]["Insert"] = {
    user_id: userId,
    name: friend.name,
    account: friend.account ?? null,
    phone: friend.phone ?? null,
  };

  const { data, error } = await supabase.from("friends").insert([payload]).select();
  if (error) throw error;
  const row = data?.[0];
  if (!row) {
    throw new Error("Supabase returned no row after inserting friend.");
  }
  return row;
}

export async function removeFriend(friendId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("friends")
    .delete()
    .eq("id", friendId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateFriend(friendId: string, updates: FriendUpdate): Promise<FriendRow> {
  const { data, error } = await supabase
    .from("friends")
    .update({
      ...updates,
    })
    .eq("id", friendId)
    .select();
  if (error) throw error;
  const row = data?.[0];
  if (!row) {
    throw new Error("Supabase returned no row after updating friend.");
  }
  return row;
}
